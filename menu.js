document.addEventListener('DOMContentLoaded', () => {
    // Game mode selection
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            startGame(mode);
        });
    });
});

function startGame(mode) {
    switch(mode) {
        case '10x10':
            window.location.href = 'board10x10.html';
            break;
        case '8x8':
            window.location.href = 'board8x8.html';
            break;
        case '12x12':
            window.location.href = 'board12x12.html';
            break;
        case 'circle':
            window.location.href = 'boardCircle.html';
            break;
        case 'dynamic':
            window.location.href = 'boardDynamic.html';
            break;
        default:
            console.error('Unknown game mode:', mode);
    }
} 