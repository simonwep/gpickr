import '../scss/_main.scss';
import '@simonwep/pickr/src/scss/themes/nano.scss';

import Pickr from '@simonwep/pickr';
import dom   from './template';

const {utils} = Pickr;
const {on, off} = utils;

class GPickr {

    _stops = [];
    _focusedStop = null;

    constructor({el}) {
        el = typeof el === 'string' ? document.querySelector(el) : el;
        el.parentElement.replaceChild(dom.root, el);

        this._pickr = Pickr.create({
            el: dom.pickr,
            theme: 'nano',
            inline: true,
            useAsButton: true,
            defaultRepresentation: 'HEXA',

            components: {
                palette: true,
                preview: true,
                opacity: true,
                hue: true,

                interaction: {
                    input: true
                }
            }
        }).on('change', color => {
            this._focusedStop.color = color.toRGBA().toString();
            this._render();
        }).on('init', () => {
            on(dom.gradient.stops.preview, 'click', e => {
                this._addStop(
                    this._pickr.getColor().toRGBA().toString(),
                    this._resolveColorStopPosition(e.pageX)
                );
            });

            this._addStop('rgb(255,132,109)', 0);
            this._addStop('rgb(255,136,230)', 1);
        });
    }

    _render() {
        const {preview} = dom.gradient.stops;
        const {_stops} = this;
        _stops.sort((a, b) => a.loc - b.loc);

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

        const stop = {
            el,
            loc,
            color
        };

        on(el, ['mousedown', 'touchstart'], () => {
            this._pickr.setColor(stop.color);
            this._focusedStop = stop;

            const m = on(window, ['mousemove', 'touchmove'], e => {
                stop.loc = this._resolveColorStopPosition(e.pageX);
                this._render();
            });

            const s = on(window, ['mouseup', 'touchend', 'touchcancel'], () => {
                off(...m);
                off(...s);
            });
        });

        this._focusedStop = stop;
        this._pickr.setColor(stop.color);
        this._stops.push(stop);
        this._render();
    }

    _resolveColorStopPosition(x) {
        const {markers} = dom.gradient.stops;
        const diff = x - markers.offsetLeft;

        let loc = diff / markers.offsetWidth;
        if (loc < 0) loc = 0;
        if (loc > 1) loc = 1;

        return loc;
    }
}

export default GPickr;
