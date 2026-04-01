let GROQ_KEY = localStorage.getItem('groq_key') || '';

const ingredientGrid = document.getElementById('ingredientGrid');
const addIngBtn = document.getElementById('addIngBtn');
const addPopup = document.getElementById('addPopup');
const newIngredient = document.getElementById('newIngredient');
const popupAdd = document.getElementById('popupAdd');
const popupCancel = document.getElementById('popupCancel');
const cuisine = document.getElementById('cuisine');
const diet = document.getElementById('diet');
const findBtn = document.getElementById('findBtn');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const results = document.getElementById('results');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');

let ingredients = [];

if (GROQ_KEY) {
    apiKeyInput.value = '••••••••••';
    keyStatus.textContent = 'Key saved';
    keyStatus.style.color = '#27ae60';
}

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key && !key.includes('•')) {
        GROQ_KEY = key;
        localStorage.setItem('groq_key', key);
        apiKeyInput.value = '••••••••••';
        keyStatus.textContent = 'Key saved';
        keyStatus.style.color = '#27ae60';
    }
});

function renderIngredients() {
    ingredientGrid.innerHTML = '';
    ingredients.forEach((ing, i) => {
        const box = document.createElement('div');
        box.className = 'ing-box';
        box.innerHTML = `<span>${ing}</span><button onclick="removeIng(${i})">&times;</button>`;
        ingredientGrid.appendChild(box);
    });
    ingredientGrid.appendChild(addIngBtn);
}

function removeIng(index) {
    ingredients.splice(index, 1);
    renderIngredients();
}

function showPopup() {
    addPopup.style.display = 'flex';
    newIngredient.value = '';
    newIngredient.focus();
}

function hidePopup() { addPopup.style.display = 'none'; }

function addIngredient() {
    const val = newIngredient.value.trim();
    if (val && !ingredients.includes(val.toLowerCase())) {
        ingredients.push(val.toLowerCase());
        renderIngredients();
    }
    newIngredient.value = '';
    newIngredient.focus();
}

addIngBtn.addEventListener('click', showPopup);
popupCancel.addEventListener('click', hidePopup);
popupAdd.addEventListener('click', addIngredient);
newIngredient.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } });

async function findRecipes() {
    if (!GROQ_KEY) { errorMsg.textContent = 'Please enter your Groq API key first.'; errorMsg.style.display = 'block'; return; }
    if (ingredients.length === 0) { errorMsg.textContent = 'Please add at least one ingredient.'; errorMsg.style.display = 'block'; return; }

    errorMsg.style.display = 'none';
    findBtn.disabled = true;
    findBtn.textContent = 'Finding...';
    results.innerHTML = '';
    loading.style.display = 'flex';

    const cuisineText = cuisine.value ? `Cuisine: ${cuisine.value}.` : '';
    const dietText = diet.value ? `Diet: ${diet.value}.` : '';

    const prompt = `You are a professional chef. I have: ${ingredients.join(', ')}.
${cuisineText} ${dietText}

Suggest exactly 3 recipes. For each:

RECIPE: [name]
TIME: [cooking time]
LEVEL: [Easy/Medium/Hard]
INGREDIENTS:
- [amount] [ingredient]
STEPS:
1. [step]
===

Use === to separate recipes. No other text.`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 2000 })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        const text = data.choices[0].message.content;
        const blocks = text.split('===').filter(b => b.trim());

        results.innerHTML = '';
        blocks.forEach(block => {
            const nameMatch = block.match(/RECIPE:\s*(.+)/);
            const timeMatch = block.match(/TIME:\s*(.+)/);
            const levelMatch = block.match(/LEVEL:\s*(.+)/);
            const name = nameMatch ? nameMatch[1].trim() : 'Recipe';
            const time = timeMatch ? timeMatch[1].trim() : '';
            const level = levelMatch ? levelMatch[1].trim() : '';

            const ingMatch = block.match(/INGREDIENTS:\s*\n([\s\S]*?)(?=STEPS:)/);
            const stepsMatch = block.match(/STEPS:\s*\n([\s\S]*?)$/);

            let ingHtml = '';
            if (ingMatch) {
                const items = ingMatch[1].trim().split('\n').filter(l => l.trim().startsWith('-'));
                ingHtml = '<ul>' + items.map(i => `<li>${i.replace(/^-\s*/, '')}</li>`).join('') + '</ul>';
            }
            let stepsHtml = '';
            if (stepsMatch) {
                const steps = stepsMatch[1].trim().split('\n').filter(l => l.trim().match(/^\d/));
                stepsHtml = '<ol>' + steps.map(s => `<li>${s.replace(/^\d+\.\s*/, '')}</li>`).join('') + '</ol>';
            }

            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="recipe-name">${name}</div>
                <div class="recipe-meta">${time ? `<span>${time}</span>` : ''}${level ? `<span>${level}</span>` : ''}</div>
                ${ingHtml ? `<div class="recipe-section"><h3>Ingredients</h3>${ingHtml}</div>` : ''}
                ${stepsHtml ? `<div class="recipe-section"><h3>Instructions</h3>${stepsHtml}</div>` : ''}
            `;
            results.appendChild(card);
        });

        if (results.children.length === 0) results.innerHTML = '<div class="error-msg">No recipes found.</div>';
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
    }

    loading.style.display = 'none';
    findBtn.disabled = false;
    findBtn.textContent = 'Find Recipes';
}

findBtn.addEventListener('click', findRecipes);
renderIngredients();
