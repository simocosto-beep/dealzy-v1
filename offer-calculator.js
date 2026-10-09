(function () {
  'use strict';
  const form = document.querySelector('#offer-calculator');
  const result = document.querySelector('#comparison-result');
  if (!form || !result) return;
  const names = ['price', 'quantity', 'fees', 'tax'];
  function offer(prefix) {
    const values = Object.fromEntries(names.map(name => [name, Number(form.elements[prefix + '-' + name].value)]));
    const base = values.price * values.quantity;
    return { total: base + values.fees + values.tax, currency: form.elements[prefix + '-currency'].value, quantity: values.quantity };
  }
  function resetResult() { result.textContent = 'Enter both offers, including fees and tax. Use 0 only when you have confirmed there is no additional charge.'; }
  form.addEventListener('input', resetResult);
  form.addEventListener('change', resetResult);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const a = offer('a'), b = offer('b');
    if (![a.total, b.total].every(Number.isFinite)) { result.textContent = 'The amounts are too large. Please check your entries.'; return; }
    const money = (value, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
    const totals = 'Offer A: ' + money(a.total, a.currency) + '. Offer B: ' + money(b.total, b.currency) + '. ';
    if (a.currency !== b.currency) { result.textContent = totals + 'Different currencies: no cheapest offer is declared. Convert all amounts to the same currency using a verified rate and include conversion fees before comparing.'; return; }
    if (a.quantity !== b.quantity) { result.textContent = totals + 'Different quantities: use the same number of people or units before comparing these totals.'; return; }
    const difference = Math.round(Math.abs(a.total - b.total) * 100) / 100;
    result.textContent = totals + (difference === 0 ? 'The totals are equal.' : 'Offer ' + (a.total < b.total ? 'A' : 'B') + ' costs ' + money(difference, a.currency) + ' less for the quantities entered.') + ' Check that dates, inclusions and cancellation terms are equivalent. This is a calculation from your entries, not a live price check.';
  });
  document.querySelector('#comparison-example').addEventListener('click', function () {
    for (const [prefix, values] of Object.entries({ a: { price: 45, quantity: 2, fees: 12, tax: 0 }, b: { price: 49, quantity: 2, fees: 0, tax: 0 } })) {
      for (const name of names) form.elements[prefix + '-' + name].value = values[name];
      form.elements[prefix + '-currency'].value = 'USD';
    }
    form.requestSubmit();
  });
  form.addEventListener('reset', resetResult);
})();
