// Point class
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// Segment class (line segment)
class Segment {
    constructor(left, right) {
        // Ensure left point has smaller x-coordinate
        if (left.x <= right.x) {
            this.left = left;
            this.right = right;
        } else {
            this.left = right;
            this.right = left;
        }
    }
}


// Find orientation of triplet (p, q, r)
function orientation(p, q, r) {
    const COLLINEAR_TOLERANCE = 1e-3; 
    const MIN_AREA_TOLERANCE = 100; // Minimum triangle area to prevent thin triangles
    
    const area = (
        p.x * (q.y - r.y) +
        q.x * (r.y - p.y) +
        r.x * (p.y - q.y)
    ) / 2;
    
    // Check both collinearity and minimum area
    if (Math.abs(area) < COLLINEAR_TOLERANCE || Math.abs(area) < MIN_AREA_TOLERANCE) {
        return 0;  // Treat as collinear if area is too small
    }
    return (area > 0) ? 1 : 2; // Clockwise or Counterclockwise
}

// Check if two segments intersect
function doIntersect(segment1, segment2) {
    const EPSILON = 1e-10; 
    
    // Get orientations
    const o1 = orientation(segment1.left, segment1.right, segment2.left);
    const o2 = orientation(segment1.left, segment1.right, segment2.right);
    const o3 = orientation(segment2.left, segment2.right, segment1.left);
    const o4 = orientation(segment2.left, segment2.right, segment1.right);

    // General case: segments intersect if orientations are different
    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases: segments are collinear and overlapping
    if (o1 === 0 && o2 === 0) {
        // Check if segments overlap on x-axis
        const overlapX = Math.max(segment1.left.x, segment2.left.x) <= 
                        Math.min(segment1.right.x, segment2.right.x) + EPSILON;
        
        // Check if segments overlap on y-axis
        const overlapY = Math.max(segment1.left.y, segment2.left.y) <= 
                        Math.min(segment1.right.y, segment2.right.y) + EPSILON;
        
        return overlapX && overlapY;
    }

    return false;
}


// Triangle class for game logic
class Triangle {
    constructor(points, player) {
        if (points.length !== 3) throw new Error("Triangle must have exactly 3 points");
        this.points = points;
        this.player = player;
        this.segments = [
            new Segment(points[0], points[1]),
            new Segment(points[1], points[2]),
            new Segment(points[2], points[0])
        ];
    }
}

class TribaGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.leftLine = document.getElementById('leftLine');
        this.rightLine = document.getElementById('rightLine');

        // Get grid type from URL
        const pathname = window.location.pathname;
        if (pathname.includes('Dynamic')) {
            this.isDynamic = true;
            this.GRID_SIZE = 10;
            this.DOT_RADIUS = 8;
            this.disabledDots = new Set();
            this.nextDisableMove = this.getRandomMoveNumber();
            this.numDotsToDisable = this.getRandomDotsNumber();
        } else if (pathname.includes('Circle')) {
            this.isCircle = true;
            this.CIRCLE_RADIUS = Math.min(this.canvas.width, this.canvas.height) * 0.45; 
            this.CENTER_X = this.canvas.width / 2;
            this.CENTER_Y = this.canvas.height / 2;
            this.DOT_RADIUS = 8; 
            this.GRID_SIZE = 24; 
        } else if (pathname.includes('8x8')) {
            this.GRID_SIZE = 8;
            this.DOT_RADIUS = 8;
        } else if (pathname.includes('12x12')) {
            this.GRID_SIZE = 12;
            this.DOT_RADIUS = 7;
        } else {
            this.GRID_SIZE = 10;
            this.DOT_RADIUS = 8;
        }

        this.DOT_OUTLINE = 2;
        this.PADDING = 80;

        // Game state
        this.currentPlayer = 'A';
        this.selectedDots = [];
        this.triangles = [];
        this.playerColors = {
            'A': '#4169E1',  // Blue
            'B': '#FFD700'   // Yellow
        };

        // Calculate spacing between dots
        this.spacingX = (this.canvas.width - 2 * this.PADDING) / (this.GRID_SIZE - 1);
        this.spacingY = (this.canvas.height - 2 * this.PADDING) / (this.GRID_SIZE - 1);

        this.dots = [];
        this.initializeGrid();
        this.addEventListeners();

        this.gameOver = false;
        this.moveCount = 0;
        this.gameCount = 0;  
    }

    drawDot(x, y, isSelected = false, isDisabled = false) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.DOT_RADIUS, 0, Math.PI * 2);
        
        // Draw outline
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = this.DOT_OUTLINE;
        this.ctx.stroke();
        
        if (isDisabled) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.globalAlpha = 0.8;
        } else {
            this.ctx.fillStyle = isSelected ? '#FFFFFF' : '#808080';
            this.ctx.globalAlpha = 1.0;
        }
        
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        this.ctx.closePath();
    }

    initializeGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateSideLines();
        
        if (this.isCircle) {
            this.dots = [];
            const rings = 6; // More rings for denser layout
            
            // Create rings of dots
            for (let ring = 0; ring < rings; ring++) {
                const radius = (this.CIRCLE_RADIUS * ring) / (rings - 1);
                const dotsInRing = ring === 0 ? 1 : Math.floor(this.GRID_SIZE * (ring / (rings - 1)));
                
                if (ring === 0) {
                    // Center dot
                    this.dots.push(new Point(this.CENTER_X, this.CENTER_Y));
                    const isDisabled = this.isDotUsed(this.dots[this.dots.length - 1]);
                    this.drawDot(this.CENTER_X, this.CENTER_Y, false, isDisabled);
                } else {
                    // Create dots in this ring
                    for (let i = 0; i < dotsInRing; i++) {
                        const angle = (i * 2 * Math.PI / dotsInRing) - Math.PI / 2;
                        const x = this.CENTER_X + radius * Math.cos(angle);
                        const y = this.CENTER_Y + radius * Math.sin(angle);
                        this.dots.push(new Point(x, y));
                        const isDisabled = this.isDotUsed(this.dots[this.dots.length - 1]);
                        this.drawDot(x, y, false, isDisabled);
                    }
                }
            }
        } else {
            for (let i = 0; i < this.GRID_SIZE; i++) {
                this.dots[i] = [];
                for (let j = 0; j < this.GRID_SIZE; j++) {
                    const x = this.PADDING + i * this.spacingX;
                    const y = this.PADDING + j * this.spacingY;
                    this.dots[i][j] = new Point(x, y);
                    const isDisabled = this.isDotUsed(this.dots[i][j]);
                    this.drawDot(x, y, false, isDisabled);
                }
            }
        }
        
        this.redrawTriangles();
    }

    addEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            this.handleClick(clickX, clickY);
        });
    }

    findClosestDot(x, y) {
        let closestDot = null;
        let minDistance = Infinity;
        const CLICK_TOLERANCE = 15;

        if (this.isCircle) {
            // Flat array for circle layout
            for (let i = 0; i < this.dots.length; i++) {
                const dot = this.dots[i];
                const distance = Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2);
                if (distance < minDistance && distance < CLICK_TOLERANCE) {
                    minDistance = distance;
                    closestDot = dot;
                }
            }
        } else {
            // Original grid layout code
            for (let i = 0; i < this.GRID_SIZE; i++) {
                for (let j = 0; j < this.GRID_SIZE; j++) {
                    const dot = this.dots[i][j];
                    const distance = Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2);
                    if (distance < minDistance && distance < CLICK_TOLERANCE) {
                        minDistance = distance;
                        closestDot = dot;
                    }
                }
            }
        }
        return closestDot;
    }

    handleClick(x, y) {
        console.log("Click detected at:", x, y);
        const dot = this.findClosestDot(x, y);
        if (!dot || this.gameOver) {
            console.log("Invalid click or game over");
            return;
        }

        if (this.isDotUsed(dot)) {
            console.log("Dot already used");
            return;
        }

        console.log(`Current player: ${this.currentPlayer}, Selected dots: ${this.selectedDots.length}`);
        
        // If this is the first dot of a new move, clear any previous failed attempt
        if (this.selectedDots.length === 0) {
            console.log("Starting new selection");
            this.initializeGrid();
        }

        // Add the dot to selected dots
        if (!this.selectedDots.includes(dot)) {
            this.selectedDots.push(dot);
            console.log(`Added dot. Total selected: ${this.selectedDots.length}`);
            this.drawDot(dot.x, dot.y, true);
        }

        if (this.selectedDots.length === 3) {
            console.log("Attempting to create triangle");
            const validMove = this.tryCreateTriangle();
            console.log("Move was:", validMove ? "valid" : "invalid");
            if (!validMove) {
                return;
            }
        }
    }

    isDotUsed(dot) {
        if (this.isDynamic && this.disabledDots.has(JSON.stringify(dot))) {
            return true;
        }
        
        const VERTEX_TOLERANCE = 2.0; 
        return this.triangles.some(triangle => {
            const isVertex = triangle.points.some(point =>
                Math.abs(point.x - dot.x) < VERTEX_TOLERANCE && 
                Math.abs(point.y - dot.y) < VERTEX_TOLERANCE
            );
            
            // Check edges with improved precision
            const isOnEdge = triangle.segments.some(segment => 
                this.isPointOnSegment(dot, segment)
            );
            
            return isVertex || isOnEdge;
        });
    }

    isPointOnSegment(point, segment) {
        const DISTANCE_TOLERANCE = 3.0;
        
        // Calculate the distance from point to line segment
        const lineLength = Math.sqrt(
            (segment.right.x - segment.left.x) ** 2 + 
            (segment.right.y - segment.left.y) ** 2
        );
        
        // If line segment is too short, just check endpoints
        if (lineLength < DISTANCE_TOLERANCE) {
            return false;
        }
        
        // Calculate distance using the point-to-line formula
        const distance = Math.abs(
            (segment.right.y - segment.left.y) * point.x -
            (segment.right.x - segment.left.x) * point.y +
            segment.right.x * segment.left.y -
            segment.right.y * segment.left.x
        ) / lineLength;
        
        // Check if point is close enough to line
        if (distance > DISTANCE_TOLERANCE) {
            return false;
        }
        
        // Check if point is between segment endpoints
        const dotProduct = 
            ((point.x - segment.left.x) * (segment.right.x - segment.left.x) +
             (point.y - segment.left.y) * (segment.right.y - segment.left.y)) / lineLength;
        
        return dotProduct >= 0 && dotProduct <= lineLength;
    }

    tryCreateTriangle() {
        console.log("Checking triangle creation...");
        if (this.gameOver || this.selectedDots.length !== 3) {
            console.log("Game over or incorrect number of dots");
            return false;
        }

        const newTriangle = new Triangle(this.selectedDots, this.currentPlayer);
        
        // Check if any selected dots are already used
        if (this.selectedDots.some(dot => this.isDotUsed(dot))) {
            console.log("Dots already used in another triangle");
            this.handleInvalidMove("Cannot use dots that are already part of a triangle!");
            return false;
        }

        // Check collinearity
        if (orientation(newTriangle.points[0], newTriangle.points[1], newTriangle.points[2]) === 0) {
            console.log("Points are collinear");
            this.handleInvalidMove("Points cannot be collinear!");
            return false;
        }

        // Check intersections with existing triangles
        if (this.triangles.length > 0 && this.hasIntersections(newTriangle)) {
            console.log("Triangle intersects with existing triangles");
            this.handleInvalidMove("Triangle cannot intersect with existing triangles!");
            return false;
        }

        console.log("Valid triangle created");
        this.handleValidMove(newTriangle);
        return true;
    }

    hasIntersections(newTriangle) {
        let existingSegments = [];
        this.triangles.forEach(triangle => {
            existingSegments.push(...triangle.segments);
        });

        for (const newSegment of newTriangle.segments) {
            for (const existingSegment of existingSegments) {
                if (doIntersect(newSegment, existingSegment)) {
                    return true;
                }
            }
        }
        return false;
    }

    handleInvalidMove(message) {
        console.log(`Invalid move by Player ${this.currentPlayer}:`, message);
        console.log(`Switching from Player ${this.currentPlayer} to Player ${this.currentPlayer === 'A' ? 'B' : 'A'}`);
        alert(`Invalid move: ${message}\nSwitching to ${this.currentPlayer === 'A' ? 'Player B' : 'Player A'}'s turn`);
        this.selectedDots = [];
        this.currentPlayer = this.currentPlayer === 'A' ? 'B' : 'A';
        this.initializeGrid();
    }

    handleValidMove(newTriangle) {
        this.moveCount++;
        this.triangles.push(newTriangle);
        this.drawTriangle(newTriangle, this.playerColors[this.currentPlayer]);
        this.ctx.stroke();
        
        // Handle dynamic board updates
        if (this.isDynamic && this.moveCount === this.nextDisableMove) {
            this.disableRandomDots();
            this.nextDisableMove = this.moveCount + this.getRandomMoveNumber();
            this.numDotsToDisable = this.getRandomDotsNumber();
        }
        
        // Store the current player before switching
        const lastPlayer = this.currentPlayer;
        
        // Switch players first
        this.currentPlayer = this.currentPlayer === 'A' ? 'B' : 'A';
        
        // Check for game over
        if (!this.isMovePossible()) {
            this.gameOver = true;
            setTimeout(() => {
                alert(`Game Over! Player ${lastPlayer} wins!`);
                if (confirm('Play again?')) {
                    this.resetGame();
                }
            }, 100);
        }
        
        this.selectedDots = [];
        this.initializeGrid();
    }

    drawTriangle(triangle, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
        this.ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
        this.ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    redrawTriangles() {
        this.triangles.forEach(triangle => {
            const color = this.playerColors[triangle.player];
            this.drawTriangle(triangle, color);
        });
    }

    resetGame() {
        this.triangles = [];
        this.selectedDots = [];
        this.gameOver = false;
        this.moveCount = 0;
        this.gameCount++;
        
        // Reset dynamic board properties
        if (this.isDynamic) {
            this.disabledDots = new Set();
            this.nextDisableMove = this.getRandomMoveNumber();
            this.numDotsToDisable = this.getRandomDotsNumber();
        }
        
        // Switch starting player every game
        if (this.gameCount % 2 === 0) {
            this.currentPlayer = 'A';
        } else {
            this.currentPlayer = 'B';
        }
        
        this.initializeGrid();
    }

    isMovePossible() {
        const unusedDots = this.getUnusedDots();
        if (unusedDots.length < 3) {
            console.log("Game over: Less than 3 dots available");
            return false;
        }

        // Check if any valid triangle can be formed
        for (let i = 0; i < unusedDots.length - 2; i++) {
            for (let j = i + 1; j < unusedDots.length - 1; j++) {
                for (let k = j + 1; k < unusedDots.length; k++) {
                    const testTriangle = new Triangle([unusedDots[i], unusedDots[j], unusedDots[k]]);
                    
                    // Check if triangle is valid (not collinear and no intersections)
                    if (orientation(unusedDots[i], unusedDots[j], unusedDots[k]) !== 0 && 
                        !this.hasIntersections(testTriangle)) {
                        console.log("Valid move still possible");
                        return true;
                    }
                }
            }
        }
        console.log("Game over: No valid triangles possible");
        return false;
    }

    isValidTriangle(p1, p2, p3) {
        const testTriangle = new Triangle([p1, p2, p3]);
        
        // Check collinearity
        if (orientation(p1, p2, p3) === 0) return false;
        
        // Check intersections
        return !this.hasIntersections(testTriangle);
    }

    getUnusedDots() {
        if (this.isCircle) {
            return this.dots.filter(dot => !this.isDotUsed(dot));
        } else {
            // Original grid code remains the same
            const unusedDots = [];
            for (let i = 0; i < this.GRID_SIZE; i++) {
                for (let j = 0; j < this.GRID_SIZE; j++) {
                    if (!this.isDotUsed(this.dots[i][j])) {
                        unusedDots.push(this.dots[i][j]);
                    }
                }
            }
            return unusedDots;
        }
    }

    updateSideLines() {
        const currentColor = this.playerColors[this.currentPlayer];
        this.leftLine.style.backgroundColor = currentColor;
        this.rightLine.style.backgroundColor = currentColor;
        
        // Update canvas shadow
        const shadowColor = this.currentPlayer === 'A' ? 'rgba(65, 105, 225, 0.5)' : 'rgba(255, 215, 0, 0.5)';
        this.canvas.style.boxShadow = `0 0 40px ${shadowColor}`;
    }

    getRandomMoveNumber() {
        return Math.floor(Math.random() * 2) + 1; // Random number between 1-2 moves
    }

    getRandomDotsNumber() {
        return Math.floor(Math.random() * 4) + 2; // Random number between 2-5 dots
    }

    disableRandomDots() {
        const unusedDots = this.getUnusedDots();
        if (unusedDots.length <= 3) return;
        
        for (let i = 0; i < this.numDotsToDisable && unusedDots.length > 3; i++) {
            const randomIndex = Math.floor(Math.random() * unusedDots.length);
            const dot = unusedDots[randomIndex];
            this.disabledDots.add(JSON.stringify(dot));
            unusedDots.splice(randomIndex, 1);
        }
        this.initializeGrid();
    }
}

// Initialize the game when the window loads
window.onload = () => {
    const game = new TribaGame('gameCanvas');
};

document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            window.location.href = href;
        });
    });

    // Existing toggleSidebar function
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    }
});