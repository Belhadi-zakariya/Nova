async function fetchTools() {
  try {
    const response = await fetch('https://api.npoint.io/e91f40fae93408bdc224');
    const data = await response.json();
    displayTools(Array.isArray(data) ? data : [data]);
  } catch (error) {
    console.error('Error fetching tools:', error);
    document.getElementById('tools-container').innerHTML = `
      <div class="error-message" role="alert">
        عذراً، حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى لاحقاً.
      </div>
    `;
  }
}

function displayTools(tools) {
  const container = document.getElementById('tools-container');
  
  const toolsHTML = tools.map(tool => `
    <button 
       class="tool-card" 
       onclick="window.open('${tool.url}', '_blank', 'noopener,noreferrer')"
       aria-label="${tool.toolname} - ${tool.description} - ${tool.credits === 0 ? 'مجاني' : `${tool.credits} رصيد`}">
      <h2 class="tool-name">${tool.toolname}</h2>
      <p class="tool-description">${tool.description}</p>
      <span class="tool-credits ${tool.credits === 0 ? 'free' : 'paid'}" aria-hidden="true">
        ${tool.credits === 0 ? 'مجاني' : `${tool.credits} رصيد`}
      </span>
    </button>
  `).join('');
  
  container.innerHTML = toolsHTML;
}

// Show loading state
document.getElementById('tools-container').innerHTML = `
  <div class="tool-card loading" aria-hidden="true">
    <div class="tool-name">جاري التحميل...</div>
    <div class="tool-description">يرجى الانتظار</div>
  </div>
`.repeat(3);

// Load tools when the page loads
document.addEventListener('DOMContentLoaded', fetchTools);