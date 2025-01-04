document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('wordInput');
    const submitBtn = document.getElementById('submitBtn');
    const guessesList = document.getElementById('guessesList');
    const statsContainer = document.getElementById('statsContainer');
    const attemptsEl = document.getElementById('attempts');
    const avgSimilarityEl = document.getElementById('avgSimilarity');
    const modal = document.getElementById('modal');
    const helpBtn = document.getElementById('helpBtn');
    const closeBtn = document.querySelector('.close');

    let attempts = 0;
    let totalSimilarity = 0;
    const guesses = new Set();

    // Modal event handlers
    helpBtn.onclick = () => modal.style.display = "block";
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = "none";
    }

    submitBtn.addEventListener('click', handleGuess);
    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });

    let nearestNeighbors = [];
    let answer = "";

    async function loadAnswers() {
        try {
            const response = await fetch('answers.txt');
            const text = await response.text();
            nearestNeighbors = text.split('\n').map(line => {
                const [rank, word, similarity] = line.split('\t');
                return {
                    rank: parseInt(rank, 10) + 1,
                    word,
                    similarity: parseFloat(similarity)
                };
            });
            answer = nearestNeighbors[0].word;
            console.log('Answers loaded successfully');
        } catch (error) {
            console.error('Error loading answers:', error);
        }
    }

    function calculateStringSimilarity(str1, str2) {
        const lengthDifference = Math.abs(str1.length - str2.length);
        const commonLength = Math.min(str1.length, str2.length);
        let commonChars = 0;

        for (let i = 0; i < commonLength; i++) {
            if (str1[i] === str2[i]) {
                commonChars++;
            }
        }

        const similarity = (commonChars / commonLength) * 100;
        return similarity > 0 ? similarity : Math.random() * 10; // Ensure similarity is not zero
    }

    async function calculateSemanticSimilarity(guessWord, targetWord) {
        const neighbor = nearestNeighbors.find(n => n.word === guessWord);
        if (neighbor) {
            return neighbor.similarity.toFixed(2);
        }

        // Calculate similarity based on string similarity
        const stringSimilarity = calculateStringSimilarity(guessWord, targetWord);
        const lowestSimilarity = nearestNeighbors[nearestNeighbors.length - 1].similarity;

        // Ensure the similarity is between 0 and the lowest similarity in the list
        return Math.max(0, Math.min(stringSimilarity, lowestSimilarity - 1)).toFixed(2);
    }

    function getRank(word) {
        const neighbor = nearestNeighbors.find(n => n.word === word);
        return neighbor ? neighbor.rank : null;
    }

    async function handleGuess() {
        const word = wordInput.value.trim();
        
        if (!word) {
            alert('단어를 입력해주세요.');
            return;
        }

        if (guesses.has(word)) {
            alert('이미 시도한 단어입니다.');
            return;
        }

        const similarity = await calculateSemanticSimilarity(word, answer);
        if (similarity === null) {
            alert('유사도를 계산할 수 없습니다. 다시 시도해주세요.');
            return;
        }

        const rank = getRank(word);
        
        addGuess(word, similarity, rank);
        sortGuesses();
        updateStats(similarity);

        wordInput.value = '';
        wordInput.focus();

        if (word === answer) {
            alert('정답입니다! 🎉');
            submitBtn.disabled = true;
            wordInput.disabled = true;
        }
    }

    function addGuess(word, similarity, rank) {
        const guessItem = document.createElement('div');
        guessItem.className = 'guess-item';
        guessItem.dataset.similarity = similarity;

        const rankText = rank ? `#${rank}` : '-';
        const progressWidth = similarity; // 0~100%

        guessItem.innerHTML = `
            <span>${rankText}</span>
            <span>${word}</span>
            <span>${similarity}</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressWidth}%"></div>
            </div>
        `;

        guessesList.appendChild(guessItem);
        guesses.add(word);
    }

    function sortGuesses() {
        const guessItems = Array.from(guessesList.children);
        guessItems.sort((a, b) => b.dataset.similarity - a.dataset.similarity);
        guessItems.forEach(item => guessesList.appendChild(item));
    }

    function updateStats(similarity) {
        attempts++;
        totalSimilarity += parseFloat(similarity);
        
        statsContainer.classList.remove('hidden');
        attemptsEl.textContent = attempts;
        avgSimilarityEl.textContent = (totalSimilarity / attempts).toFixed(2);
    }

    // Initialize by loading the answers
    loadAnswers();
});