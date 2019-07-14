import '../scss/_main.scss';
import '@simonwep/pickr/src/scss/themes/nano.scss';

import Pickr from '@simonwep/pickr';
import dom   from './template';

const {utils, libs} = Pickr;

class GPickr {

    _stops = [];

    constructor({el}) {
        el = typeof el === 'string' ? document.querySelector(el) : el;
        el.parentElement.replaceChild(dom.root, el);

        this._pickr = Pickr.create({
            el: dom.pickr,
            theme: 'nano',
            inline: true,
            useAsButton: true,

            components: {
                palette: true,
                preview: true,
                opacity: true,
                hue: true,

                interaction: {
                    hex: true,
                    rgba: true,
                    input: true,
                    cancel: true
                }
            }
        });

        this._addStop('#ff846d', 0);
        this._addStop('#ff88e6', 1);
        this._render();
    }

    _render() {
        const {preview} = dom.gradient.stops;
        const {_stops} = this;

        for (const {color, el, loc} of _stops) {
            Object.assign(el.style, {
                left: `${loc * 100}%`,
                color
            });
        }

        // Apply gradient
        const linearStops = _stops.map(v => `${v.color} ${v.loc * 100}%`);
        preview.style.background = `linear-gradient(to right, ${linearStops.join(',')})`;
    }

    _addStop(color, loc = 0.5) {
        const {markers} = dom.gradient.stops;
        const el = utils.createElementFromString('<div class="gpcr-marker"></div>');
        markers.appendChild(el);

        const moveable = new libs.Moveable({
            lock: 'v',
            element: el,
            wrapper: markers
        });

        this._stops.push({el, moveable, loc, color});
    }
}

export default GPickr;
