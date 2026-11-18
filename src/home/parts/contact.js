// Contact: the field in which the letters of SyberLabs appear (src/visuals/phase.js; the pointer breaks its step),
// one sentence and the action.
import { CONTACT, CONSULT, EMAIL, GITHUB } from '../../../projects/site-data.js';

export const contact = () => `<section id="contact" class="home-contact" aria-labelledby="contact-title">
      <div class="home-contact__field"><canvas data-visual="field" role="img" aria-label="A field of coupled oscillators falls into step. The letters of SyberLabs appear as the strokes that stay a quarter turn out of phase."></canvas></div>
      <div class="home-contact__copy sy-wrap">
        <h2 id="contact-title">Tell us what you are building.</h2>
        <p>Email a short outline of the problem and where AI should help. We reply with next steps.</p>
        <a class="sy-btn sy-btn--solid" href="${CONSULT}">Book a consultation</a>
        <p class="home-contact__links"><a href="${CONTACT}">${EMAIL}</a><a href="${GITHUB}">GitHub</a></p>
      </div>
    </section>`;
