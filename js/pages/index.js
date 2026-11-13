/**
 * LALA Bridge — script da página index.html
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('needs-preview');
  const needs = Donations.getOpenNeeds().slice(0, 3);
  container.innerHTML = needs.map((n) => App.renderNeedCard(n)).join('');

  // Dark card override for this section
  container.querySelectorAll('.card').forEach((card) => {
    card.classList.add('card--dark');
  });

  App.animateCounters();
});
