const SAMPLE_RECIPES = [
{ name: 'Pancakes', ingredients: { flour: '1 cup', milk: '3/4 cup', egg: '1' }, time: '20 min' },
{ name: 'Omelette', ingredients: { egg: '2', salt: 'to taste', butter: '1 tbsp' }, time: '10 min' },
{ name: 'Tomato Pasta', ingredients: { pasta: '200 g', tomato: '2', garlic: '2 cloves' }, time: '30 min' }
];

function $id(id){ return document.getElementById(id); }

function loadRecipes(){
try{
const raw = localStorage.getItem('recipes_db');
if(!raw) return SAMPLE_RECIPES.slice();
return JSON.parse(raw);
}catch(e){ return SAMPLE_RECIPES.slice(); }
}

function saveRecipes(list){
localStorage.setItem('recipes_db', JSON.stringify(list));
}

let recipes = loadRecipes();

function appendUser(text){
const chat = $id('chat');
const d = document.createElement('div');
d.className = 'msg user';
d.textContent = text;
const m = document.createElement('div'); m.className = 'meta'; m.textContent = 'You';
d.appendChild(m);
chat.appendChild(d);
chat.scrollTop = chat.scrollHeight;
}

function appendBot(html){
const chat = $id('chat');
const d = document.createElement('div');
d.className = 'msg bot';
d.innerHTML = html;
const m = document.createElement('div'); m.className = 'meta'; m.textContent = 'RecipeBot';
d.appendChild(m);
chat.appendChild(d);
chat.scrollTop = chat.scrollHeight;
}

function renderRecipesList(){
const container = $id('recipesList');
container.innerHTML = '';
recipes.forEach(r => {
const el = document.createElement('div');
el.className = 'recipe-card';
el.innerHTML = `<h4>${escapeHtml(r.name)}</h4><p class="muted">${Object.keys(r.ingredients||{}).length} ingredients • ${r.time||''}</p><div style="margin-top:8px"><button class="small" data-name="${encodeURIComponent(r.name)}">Ask</button></div>`;
container.appendChild(el);
});
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function handleInput(text){
if(!text || !text.trim()) return;
appendUser(text);
text = text.trim();

if(/^add recipe[:]/i.test(text)){
const payload = text.split(':').slice(1).join(':').trim();
const nameMatch = payload.match(/name\s*=\s*([^;]+)/i);
const ingMatch = payload.match(/ingredients\s*=\s*([^;]+)/i);
if(!nameMatch || !ingMatch){ appendBot('To add a recipe use: Add recipe: name=My Dish; ingredients=tomato|egg'); return; }
const name = nameMatch[1].trim();
const ingParts = ingMatch[1].split(/\||,/).map(s=>s.trim()).filter(Boolean);
const ingredients = {};
ingParts.forEach(p => { ingredients[p.toLowerCase()] = ''; });
recipes.push({ name, ingredients, time: '' });
saveRecipes(recipes);
renderRecipesList();
appendBot('Recipe added: ' + escapeHtml(name));
return;
}

// 2) "I have" or comma-separated -> find by ingredients
if(/^i have/i.test(text) || text.includes(',') && text.split(',').length > 1){
let list = text.replace(/^i have/i,'').split(/,| and |&/i).map(s=>s.trim().toLowerCase()).filter(Boolean);
if(list.length === 0){ appendBot("I couldn't detect ingredients."); return; }

const scored = recipes.map(r => {
const keys = Object.keys(r.ingredients || {}).map(k=>k.toLowerCase());
const matched = keys.filter(k => list.some(t => k.includes(t) || t.includes(k)));
return { r, score: matched.length, matched, missing: keys.filter(k=> !matched.includes(k)) };
}).filter(x => x.score > 0).sort((a,b) => b.score - a.score);

if(scored.length === 0){ appendBot('No matching recipes found.'); return; }
let html = '<b>Recipes that match:</b><br/>';
scored.slice(0,5).forEach(s => {
html += `<div style="margin-top:8px"><strong>${escapeHtml(s.r.name)}</strong> — ${s.score} match(es) <div class="muted">Missing: ${s.missing.slice(0,4).join(', ')}</div><div style="margin-top:6px"><button class="small" data-show="${encodeURIComponent(s.r.name)}">Show ingredients</button></div></div>`;
});
appendBot(html);
return;
}

// 3) Try recipe name match
const q = text.toLowerCase();
const found = recipes.filter(r => r.name.toLowerCase().includes(q));
if(found.length > 0){
let html = '<b>Found recipe(s):</b><br/>';
found.forEach(r => {
html += `<div style="margin-top:8px"><strong>${escapeHtml(r.name)}</strong><div class="muted">${Object.keys(r.ingredients||{}).length} ingredients</div><div style="margin-top:6px"><button class="small" data-show="${encodeURIComponent(r.name)}">Show ingredients</button></div></div>`;
});
appendBot(html);
return;
}

appendBot("Sorry — I couldn't understand. Try: 'I have eggs, milk' or 'Pancakes'");
}

// Show ingredients by recipe name
function showIngredientsByName(name){
name = decodeURIComponent(name);
const recipe = recipes.find(r => r.name.toLowerCase() === name.toLowerCase() || r.name === name);
if(!recipe){ appendBot('Recipe not found.'); return; }
let html = `<b>${escapeHtml(recipe.name)}</b><ul style="margin:8px 0 6px 18px">`;
Object.entries(recipe.ingredients||{}).forEach(([k,v]) => { html += `<li>${escapeHtml(k)} ${v ? '— ' + escapeHtml(v) : ''}</li>`; });
html += '</ul>';
appendBot(html);
}

window.addEventListener('DOMContentLoaded', () => {
renderRecipesList();

const addBtn = $id('addRecipeBtn');
    const newNameEl = $id('newName');
    const newIngredientsEl = $id('newIngredients');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const name = String(newNameEl.value || '').trim();
        const raw = String(newIngredientsEl.value || '').trim();

        if (!name || !raw) {
          alert('Please enter recipe name and ingredients (one per line).');
          return;
        }

        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const ingredients = {};
        lines.forEach(line => {
          const parts = line.split(/\s*[-:]\s*/);
          if (parts.length >= 2) {
            ingredients[parts[0].toLowerCase()] = parts.slice(1).join('-').trim();
          } else {
            ingredients[parts[0].toLowerCase()] = '';
          }
        });

        recipes.push({ name, ingredients, time: '' });
        saveRecipes(recipes);
        renderRecipesList();

        newNameEl.value = '';
        newIngredientsEl.value = '';

        appendBot('✅ Recipe added: ' + escapeHtml(name));
      });
    }
$id('sendBtn').addEventListener('click', ()=>{ const t = $id('userInput').value; handleInput(t); $id('userInput').value=''; $id('userInput').focus(); });
$id('userInput').addEventListener('keydown', e=>{ if(e.key === 'Enter') { e.preventDefault(); $id('sendBtn').click(); } });
document.addEventListener('click', e=>{
const b = e.target;
if(b && b.dataset && b.dataset.show) showIngredientsByName(b.dataset.show);
if(b && b.dataset && b.dataset.name) showIngredientsByName(b.dataset.name);
});
$id('clearBtn').addEventListener('click', ()=>{ $id('chat').innerHTML = ''; });

appendBot('<b>Hello —</b> Try: "I have eggs, milk" or type a recipe name like "Pancakes". Use "Add recipe: name=My Dish; ingredients=egg|flour" to add a recipe.');
});