export function blinkInput(el: HTMLElement) {
    el.classList.remove('input-error-blink'); 
    void el.offsetWidth;
    el.classList.add('input-error-blink');
  }