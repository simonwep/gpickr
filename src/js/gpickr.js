import '../scss/_main.scss';
import '@simonwep/pickr/src/scss/themes/nano.scss';

import Pickr from '@simonwep/pickr';
import dom   from './template';

const {utils} = Pickr;
const {on, off} = utils;

class GPickr {

    _stops = [];
    _focusedStop = null;
    _mode = 'linear';

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
            const {gradient} = dom;

            // Switch gradient mode
            on(gradient.controls.mode, 'click', e => {
                e.target.innerText = this._mode;
                this._mode = (this._mode === 'linear') ? 'radial' : 'linear';
                this._render();
            });

            // Adding new stops
            on(gradient.stops.preview, 'click', e => {
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
        const {stops: {preview}, result} = dom.gradient;
        const {_stops, _mode} = this;
        _stops.sort((a, b) => a.loc - b.loc);

        for (const {color, el, loc} of _stops) {
            Object.assign(el.style, {
                left: `${loc * 100}%`,
                color
            });
        }

        // Apply gradient
        const linearStops = _stops.map(v => `${v.color} ${v.loc * 100}%`).join(',');
        preview.style.background = `linear-gradient(to right, ${linearStops})`;

        // Update result
        switch (_mode) {
            case 'linear': {
                result.style.background = `linear-gradient(to right, ${linearStops})`;
                break;
            }
            case 'radial': {
                result.style.background = `radial-gradient(circle at center, ${linearStops})`;
            }
        }
    }

    _addStop(color, loc = 0.5) {
        const {markers} = dom.gradient.stops;
        const el = utils.createElementFromString('<div class="gpcr-marker"></div>');
        markers.appendChild(el);

        const stop = {
            el,
            loc,
            color,

            listener: on(el, ['mousedown', 'touchstart'], () => {
                const markersbcr = markers.getBoundingClientRect();
                this._pickr.setColor(stop.color);
                this._focusedStop = stop;
                let hidden = false;

                // Listen for mouse / touch movements
                const m = on(window, ['mousemove', 'touchmove'], e => {
                    const rootDistance = Math.abs(e.pageY - markersbcr.y);

                    // Allow the user to remove the current stop with trying to drag the stop away
                    hidden = rootDistance > 50;
                    el.style.opacity = hidden ? '0' : '1';

                    if (!hidden) {
                        stop.loc = this._resolveColorStopPosition(e.pageX);
                        this._render();
                    }
                });

                // Clear up after interaction endet
                const s = on(window, ['mouseup', 'touchend', 'touchcancel'], () => {
                    off(...m);
                    off(...s);

                    // If hidden, which means the user wants to remove it, remove the current stop
                    if (hidden) {
                        this._removeStop(stop);
                        this._render();
                    }
                });
            })
        };


        this._focusedStop = stop;
        this._pickr.setColor(stop.color);
        this._stops.push(stop);
        this._render();
    }

    _removeStop(stop) {
        const {_stops} = this;

        // Remove stop from list
        _stops.splice(_stops.indexOf(stop), 1);

        // Remove stop element
        stop.el.remove();

        // Unbind listener
        off(...stop.listener);

        // Focus another stop since the current one may gone
        if (this._focusedStop === stop) {
            this._focusedStop = _stops[0];
        }
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
