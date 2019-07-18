import '../scss/_main.scss';

import Pickr         from '@simonwep/pickr';
import buildGPickr   from './template';
import simplifyEvent from '../js/utils/simplifyEvent';
import parseGradient from '../js/utils/parseGradient';

const {utils} = Pickr;
const {on, off} = utils;

class GPickr {

    // Gradient props
    _stops = [];
    _angle = 0;
    _pos = 'circle at center';

    _focusedStop = null;
    _mode = 'linear';
    _root = null;
    _eventListener = {
        init: [],
        change: []
    };

    constructor(opt) {
        opt = Object.assign({
            stops: [
                ['#42445a', 0],
                ['#20b6dd', 1]
            ]
        }, opt);

        // Build dom
        this._root = buildGPickr(opt);
        console.log(this._root);

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
            this._focusedStop.color = color.toRGBA().toString(0);
            this._render();
        }).on('init', () => {

            // Add pre-defined swatches
            for (const [color, loc] of opt.stops) {
                this.addStop(color, loc, true);
            }

            this._bindEvents();
            this._emit('init', this);
        });
    }

    _bindEvents() {
        const {gradient} = this._root;

        // Switch gradient mode
        on(gradient.mode, ['mousedown', 'touchstart'], e => {

            // Set new mode
            this._mode = (this._mode === 'linear') ? 'radial' : 'linear';

            // Repaint
            this._render(true);

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
        on(gradient.result, ['mousedown', 'touchstart'], e => {
            e.preventDefault();

            if (this._mode !== 'linear') {
                return;
            }

            gradient.angle.classList.add(`gpcr-active`);
            const m = on(window, ['mousemove', 'touchmove'], e => {
                const {x, y} = simplifyEvent(e);
                const box = gradient.angle.getBoundingClientRect();

                // Calculate angle relative to the center
                const boxcx = box.left + box.width / 2;
                const boxcy = box.top + box.height / 2;
                const radians = Math.atan2(x - boxcx, (y - boxcy)) - Math.PI;
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

        // Adusting circle position
        on(gradient.pos, ['mousedown', 'touchstart'], e => {
            this._pos = (() => {
                switch (e.target.getAttribute('data-pos')) {
                    case 'tl':
                        return 'circle at top left';
                    case 'tm':
                        return 'circle at top center';
                    case 'tr':
                        return 'circle at top right';
                    case 'r':
                        return 'circle at right';
                    case 'm':
                        return 'circle at center';
                    case 'l':
                        return 'circle at left';
                    case 'br':
                        return 'circle at bottom right';
                    case 'bm':
                        return 'circle at bottom center';
                    case 'bl':
                        return 'circle at bottom left';
                    default:
                        return this._pos;
                }
            })();

            this._render();
        });
    }

    _render(silent = false) {
        const {stops: {preview}, result, arrow, angle, pos, mode} = this._root.gradient;
        const {_stops, _mode, _angle, _pos} = this;
        _stops.sort((a, b) => a.loc - b.loc);

        for (const {color, el, loc} of _stops) {
            Object.assign(el.style, {
                left: `${loc * 100}%`,
                color
            });
        }

        // Apply gradient
        const linearStops = this.getStops().toString();
        preview.style.background = `linear-gradient(to right, ${linearStops})`;

        // Rotate arrow
        arrow.style.transform = `rotate(${_angle - 90}deg)`;

        // Update result
        result.style.background = (() => {
            switch (_mode) {
                case 'linear':
                    return `linear-gradient(${_angle}deg, ${linearStops})`;
                case 'radial':
                    return `radial-gradient(${_pos}, ${linearStops})`;
            }
        })();

        // Show / hide angle control. Update switch button
        const linear = this._mode === 'linear';

        pos.style.opacity = linear ? '0' : '';
        pos.style.visibility = linear ? 'hidden' : '';

        angle.style.opacity = linear ? '' : '0';
        angle.style.visibility = linear ? '' : 'hidden';

        mode.setAttribute('data-mode', linear ? 'radial' : 'linear');

        // Fire event
        !silent && this._emit('change', this);
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
     * @param silent
     * @returns {GPickr}
     */
    addStop(color, loc = 0.5, silent = false) {
        const {markers} = this._root.gradient.stops;
        const el = utils.createElementFromString('<div class="gpcr-marker"></div>');
        markers.appendChild(el);

        this._pickr.setColor(color);
        color = this._pickr.getColor().toRGBA().toString(0);

        const stop = {
            el, loc, color,

            listener: on(el, ['mousedown', 'touchstart'], e => {
                e.preventDefault();
                const markersbcr = markers.getBoundingClientRect();
                this._pickr.setColor(stop.color);
                this._focusedStop = stop;
                let hidden = false;

                // Listen for mouse / touch movements
                const m = on(window, ['mousemove', 'touchmove'], e => {
                    const {x, y} = simplifyEvent(e);
                    const rootDistance = Math.abs(y - markersbcr.y);

                    // Allow the user to remove the current stop with trying to drag the stop away
                    hidden = rootDistance > 50 && this._stops.length > 2;
                    el.style.opacity = hidden ? '0' : '1';

                    if (!hidden) {
                        stop.loc = this._resolveColorStopPosition(x);
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
                        this._render(true);
                    }
                });
            })
        };

        this._focusedStop = stop;
        this._stops.push(stop);
        this._render(silent);
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

    /**
     * Returns the gradient as css background string
     * @returns {string}
     */
    getGradient() {
        const linearStops = this.getStops().toString();

        switch (this._mode) {
            case 'linear':
                return `linear-gradient(${this._angle}deg, ${linearStops})`;
            case 'radial':
                return `radial-gradient(${this._pos}, ${linearStops})`;
        }
    }

    /**
     * Returns the current stops.
     * To toString function is overridden and returns the comma-joined version which
     * can be used to custimize the direction aka angle.
     * @returns {{color: *, location: *}[]}
     */
    getStops() {
        const stops = this._stops.map(v => ({
            color: v.color,
            location: v.loc
        }));

        stops.toString = function () {
            return this.map(v => `${v.color} ${v.location * 100}%`).join(',');
        };

        return stops;
    }

    /**
     * Returns the current angle.
     * @returns {number}
     */
    getAngle() {
        return this._mode === 'linear' ? this._angle : -1;
    }

    /**
     * Tries to parse a css (similar?) gradient string.
     * @param gradient
     * @returns {boolean}
     */
    setGradient(gradient) {
        const parsed = parseGradient(gradient);

        if (parsed) {
            const {type, stops} = parsed;
            this._mode = type;

            for (const {color, loc} of stops) {
                this.addStop(color, loc);
            }

            return true;
        }

        return false;
    }

    _emit(event, ...args) {
        this._eventListener[event].forEach(cb => cb(...args, this));
    }

    /**
     * Adds an eventlistener
     * @param event
     * @param cb
     * @returns {GPickr}
     */
    on(event, cb) {

        // Validate
        if (typeof cb === 'function' && typeof event === 'string' && event in this._eventListener) {
            this._eventListener[event].push(cb);
        }

        return this;
    }

    /**
     * Removes an eventlistener
     * @param event
     * @param cb
     * @returns {GPickr}
     */
    off(event, cb) {
        const callBacks = this._eventListener[event];

        if (callBacks) {
            const index = callBacks.indexOf(cb);

            if (~index) {
                callBacks.splice(index, 1);
            }
        }

        return this;
    }
}

// Expose pickr
GPickr.Pickr = Pickr;

export default GPickr;
