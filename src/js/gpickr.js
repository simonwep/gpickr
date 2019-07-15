import '../scss/_main.scss';

import Pickr       from '@simonwep/pickr';
import buildGPickr from './template';

const {utils} = Pickr;
const {on, off} = utils;

class GPickr {

    _stops = [];
    _angle = 0;
    _focusedStop = null;
    _mode = 'linear';
    _root;

    constructor(opt) {
        opt = Object.assign({
            stops: [
                ['#42445a', 0],
                ['#20b6dd', 1]
            ]
        }, opt);

        // Build dom
        this._root = buildGPickr(opt);

        opt.el = opt.el.split(/>>/g).reduce((pv, cv, ci, a) => {
            pv = pv.querySelector(cv);
            return ci < a.length - 1 ? pv.shadowRoot : pv;
        }, document);

        opt.el.parentElement.replaceChild(this._root.root, opt.el);

        this._pickr = Pickr.create({
            el: this._root.pickr,
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

            // Add pre-defined swatches
            for (const [color, loc] of opt.stops) {
                this.addStop(color, loc);
            }

            this._bindEvents();
        });
    }

    _bindEvents() {
        const {gradient} = this._root;

        // Switch gradient mode
        on(gradient.mode, ['mousedown', 'touchstart'], e => {

            // Update button mode
            e.target.setAttribute('data-mode', this._mode);

            // Set new mode
            this._mode = (this._mode === 'linear') ? 'radial' : 'linear';

            // Show / hide angle control
            gradient.angle.style.opacity = (this._mode === 'linear') ? '1' : '0';

            // Repaint
            this._render();

            // Prevent some things
            e.stopPropagation();
        });

        // Adding new stops
        on(gradient.stops.preview, 'click', e => {
            this.addStop(
                this._pickr.getColor().toRGBA().toString(),
                this._resolveColorStopPosition(e.pageX)
            );
        });

        // Adjusting the angle
        on(gradient.result, ['mousedown', 'touchstart'], () => {

            if (this._mode !== 'linear') {
                return;
            }

            gradient.angle.classList.add(`gpcr-active`);
            const m = on(window, ['mousemove', 'touchmove'], e => {
                const box = gradient.angle.getBoundingClientRect();

                // Calculate angle relative to the center
                const boxcx = box.left + box.width / 2;
                const boxcy = box.top + box.height / 2;
                const radians = Math.atan2(e.pageX - boxcx, (e.pageY - boxcy)) - Math.PI;
                const degrees = Math.abs(radians * 180 / Math.PI);

                // ctrl and shift can be used to divide / quarter the snapping points
                const div = [1, 2, 4][Number(e.shiftKey || e.ctrlKey * 2)];
                this._angle = degrees - (degrees % (45 / div));
                this._render();
            });

            const s = on(window, ['mouseup', 'touchend', 'touchcancel'], () => {
                gradient.angle.classList.remove(`gpcr-active`);
                off(...m);
                off(...s);
            });
        });
    }

    _render() {
        const {stops: {preview}, result, arrow} = this._root.gradient;
        const {_stops, _mode, _angle} = this;
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

        // Rotate arrow
        arrow.style.transform = `rotate(${_angle - 90}deg)`;

        // Update result
        result.style.background = (() => {
            switch (_mode) {
                case 'linear':
                    return `linear-gradient(${_angle}deg, ${linearStops})`;
                case 'radial':
                    return `radial-gradient(circle at center, ${linearStops})`;
            }
        })();
    }

    _resolveColorStopPosition(x) {
        const {markers} = this._root.gradient.stops;
        const mbcr = markers.getBoundingClientRect();
        const diff = x - mbcr.left;

        let loc = diff / mbcr.width;
        if (loc < 0) loc = 0;
        if (loc > 1) loc = 1;

        return loc;
    }

    /**
     * Adds a stop
     * @param color Stop color
     * @param loc Location between 0 and 1
     * @returns {GPickr}
     */
    addStop(color, loc = 0.5) {
        const {markers} = this._root.gradient.stops;
        const el = utils.createElementFromString('<div class="gpcr-marker"></div>');
        markers.appendChild(el);

        this._pickr.setColor(color);
        color = this._pickr.getColor().toRGBA().toString();

        const stop = {
            el, loc, color,

            listener: on(el, ['mousedown', 'touchstart'], () => {
                const markersbcr = markers.getBoundingClientRect();
                this._pickr.setColor(stop.color);
                this._focusedStop = stop;
                let hidden = false;

                // Listen for mouse / touch movements
                const m = on(window, ['mousemove', 'touchmove'], e => {
                    const rootDistance = Math.abs(e.pageY - markersbcr.y);

                    // Allow the user to remove the current stop with trying to drag the stop away
                    hidden = rootDistance > 50 && this._stops.length > 2;
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
                        this.removeStop(stop);
                        this._render();
                    }
                });
            })
        };

        this._focusedStop = stop;
        this._stops.push(stop);
        this._render();
        return this;
    }

    /**
     * Removes a stop.
     * @param v Location, color or stop object
     */
    removeStop(v) {
        const {_stops} = this;

        const stop = (() => {
            if (typeof v === 'number') {
                return _stops.find(v => v.loc === v);
            } else if (typeof v === 'string') {
                return _stops.find(v => v.color === v);
            } else if (typeof v === 'object') {
                return v;
            }
        })();

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
}

// Expose pickr
GPickr.Pickr = Pickr;

export default GPickr;
