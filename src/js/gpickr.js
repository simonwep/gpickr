import '../scss/_main.scss';

import Pickr from '@simonwep/pickr';

import buildGPickr from './template';
import simplifyEvent from './utils/simplifyEvent';
import parseGradient from './utils/parseGradient';

const FOCUSED_STOP = 'focused-stop';

const { utils } = Pickr;
const { on, off } = utils;

const setDefaults = (opt) => {
    const pickr = Object.assign(
        {
            // color formats
            cmyk: false,
            hex: false,
            hsla: false,
            hsva: false,
            rgba: true,

            cancel: false,
            clear: false,
            save: false,

            input: true,
            swatches: [],
            theme: 'classic',
            preview: true,
            opacity: true,
            hue: true,
            palette: true,
        },
        opt.pickr
    );

    delete opt.pickr;

    if (!opt.angle) opt.angle = 0;
    if (!opt.mode) opt.mode = 'linear';
    if (!opt.stops)
        opt.stops = [
            ['#42445a', 0],
            ['#20b6dd', 1],
        ];

    return Object.assign(
        {
            // gradient types
            conic: false,
            linear: true,
            radial: true,

            lockOpacity: false,
            pickr,
        },
        opt
    );
};

class GPickr {
    // Gradient props
    _stops = [];

    // Linear angle
    _angle = 0;
    _angles = [
        { angle: 0, name: 'to top' },
        { angle: 90, name: 'to right' },
        { angle: 180, name: 'to bottom' },
        { angle: 270, name: 'to left' },
        { angle: 45, name: 'to top right' },
        { angle: 45, name: 'to right top' },
        { angle: 135, name: 'to right bottom' },
        { angle: 135, name: 'to bottom right' },
        { angle: 225, name: 'to left bottom' },
        { angle: 225, name: 'to bottom left' },
        { angle: 315, name: 'to top left' },
        { angle: 315, name: 'to left top' },
    ];

    // Radial direction
    _direction = 'circle at center';
    _directions = [
        { pos: 'tl', css: 'circle at left top' },
        { pos: 'tm', css: 'circle at center top' },
        { pos: 'tr', css: 'circle at right top' },
        { pos: 'r', css: 'circle at right' },
        { pos: 'm', css: 'circle at center' },
        { pos: 'l', css: 'circle at left' },
        { pos: 'br', css: 'circle at right bottom' },
        { pos: 'bm', css: 'circle at center bottom' },
        { pos: 'bl', css: 'circle at left bottom' },
    ];

    _focusedStop = null;
    _mode = 'linear';
    _modes = [];
    _root = null;
    _eventListener = {
        init: [],
        change: [],
        colorChange: [],
    };

    constructor(opt) {
        opt = setDefaults(opt);

        // Build dom
        this._root = buildGPickr(opt);

        if (opt.angle) this._angle = opt.angle;

        if (opt.radial) this._modes.push('radial');

        // Check if conic-gradient is supported
        if (opt.conic && CSS.supports('background-image', 'conic-gradient(#fff, #fff)')) {
            this._modes.push('conic');
        }

        if (opt.linear || this._modes.length === 0) this._modes.push('linear');

        if (opt.mode && this._modes.indexOf(opt.mode) !== -1) this._mode = opt.mode;

        opt.el = opt.el.split(/>>/g).reduce((pv, cv, ci, a) => {
            pv = pv.querySelector(cv);
            return ci < a.length - 1 ? pv.shadowRoot : pv;
        }, document);

        opt.el.parentElement.replaceChild(this._root.root, opt.el);

        this._pickr = Pickr.create({
            el: this._root.pickr,
            theme: opt.pickr.theme,
            inline: true,
            useAsButton: true,
            showAlways: true,
            defaultRepresentation: 'HEXA',
            swatches: opt.pickr.swatches,
            lockOpacity: opt.pickr.lockOpacity,

            components: {
                palette: opt.pickr.palette,
                preview: opt.pickr.preview,
                opacity: opt.pickr.opacity,
                hue: opt.pickr.hue,

                interaction: {
                    input: opt.pickr.input,
                    hex: opt.pickr.hex,
                    rgba: opt.pickr.rgba,
                    cmyk: opt.pickr.cmyk,
                    hsla: opt.pickr.hsla,
                    hsva: opt.pickr.hsva,
                    cancel: opt.pickr.cancel,
                    clear: opt.pickr.clear,
                    save: opt.pickr.save,
                },
            },
        })
            .on('change', (color) => {
                if (this._focusedStop) {
                    this._focusedStop.color = color.toRGBA().toString(0);
                    this._render();
                }
            })
            .on('init', () => {
                // Add pre-defined swatches
                for (const [color, loc] of opt.stops) {
                    this.addStop(color, loc, true);
                }

                this._bindEvents();
                this._emit('init', this);
            });
    }

    _bindEvents() {
        const { gradient } = this._root;

        // Switch gradient mode
        on(gradient.mode, ['mousedown', 'touchstart'], (e) => {
            const nextIndex = this._modes.indexOf(this._mode) + 1;
            this._mode = this._modes[nextIndex === this._modes.length ? 0 : nextIndex];

            // Repaint
            this._render();

            // Prevent some things
            e.stopPropagation();
        });

        // Adding new stops
        on(gradient.stops.preview, 'click', (e) => {
            this.addStop(
                this._pickr.getColor().toRGBA().toString(),
                this._resolveColorStopPosition(e.pageX)
            );
        });

        // Adjusting the angle
        on(gradient.result, ['mousedown', 'touchstart'], (e) => {
            e.preventDefault();

            if (this._mode !== 'linear') {
                return;
            }

            gradient.angle.classList.add(`gpcr-active`);
            const m = on(window, ['mousemove', 'touchmove'], (e) => {
                const { x, y } = simplifyEvent(e);
                const box = gradient.angle.getBoundingClientRect();

                // Calculate angle relative to the center
                const boxcx = box.left + box.width / 2;
                const boxcy = box.top + box.height / 2;
                const radians = Math.atan2(x - boxcx, y - boxcy) - Math.PI;
                const degrees = Math.abs((radians * 180) / Math.PI);

                // ctrl and shift can be used to divide / quarter the snapping points
                const div = [1, 2, 4][Number(e.shiftKey || e.ctrlKey * 2)];
                this.setLinearAngle(degrees - (degrees % (45 / div)));
            });

            const s = on(window, ['mouseup', 'touchend', 'touchcancel'], () => {
                gradient.angle.classList.remove(`gpcr-active`);
                off(...m);
                off(...s);
            });
        });

        // Adusting circle position
        on(gradient.pos, ['mousedown', 'touchstart'], (e) => {
            const pos = e.target.getAttribute('data-pos');
            const pair = this._directions.find((v) => v.pos === pos);
            this.setRadialPosition((pair && pair.css) || this._direction);
        });
    }

    _getAngleFromString(str) {
        str = str.toLowerCase();
        const angle = this._angles.find((ang) => ang.name === str);
        return angle ? angle.angle : undefined;
    }

    _render(silent = false) {
        const {
            stops: { preview },
            result,
            arrow,
            angle,
            pos,
            mode,
        } = this._root.gradient;
        const { _stops, _mode, _angle } = this;
        _stops.sort((a, b) => a.loc - b.loc);

        for (const { color, el, loc } of _stops) {
            Object.assign(el.style, {
                left: `${loc * 100}%`,
                color,
            });
        }

        // Rotate arrow
        const arrowDir =
            typeof _angle === 'number' ? _angle : this._getAngleFromString(_angle) || 0;
        arrow.style.transform = `rotate(${arrowDir - 90}deg)`;

        // Apply gradient and update result
        preview.style.background = `linear-gradient(to right, ${this.getStops().toString(
            'linear'
        )})`;
        result.style.background = this.getGradient().toString();

        // Show / hide angle control. Update switch button
        pos.style.opacity = _mode === 'radial' ? '' : '0';
        pos.style.visibility = _mode === 'radial' ? '' : 'hidden';
        angle.style.opacity = _mode === 'linear' ? '' : '0';
        angle.style.visibility = _mode === 'linear' ? '' : 'hidden';

        mode.setAttribute('data-mode', _mode);

        // Fire event
        !silent && this._emit('change', this);
    }

    _resolveColorStopPosition(x) {
        const { markers } = this._root.gradient.stops;
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
        const { markers } = this._root.gradient.stops;
        const el = utils.createElementFromString('<div class="gpcr-marker"></div>');
        markers.appendChild(el);

        const stop = {
            el,
            loc,
            color,

            listener: on(el, ['mousedown', 'touchstart'], (e) => {
                e.preventDefault();
                const markersbcr = markers.getBoundingClientRect();
                this.setFocusedStop(stop);
                this._pickr.setColor(stop.color);
                let hidden = false;

                // Listen for mouse / touch movements
                const m = on(window, ['mousemove', 'touchmove'], (e) => {
                    const { x, y } = simplifyEvent(e);
                    const rootDistance = Math.abs(y - markersbcr.y);

                    // Allow the user to remove the current stop with trying to drag the stop away
                    hidden = rootDistance > 50 && this._stops.length > 2;
                    el.style.opacity = hidden ? '0' : '1';

                    if (!hidden) {
                        stop.loc = this._resolveColorStopPosition(x);
                        this._render();
                    }
                });

                // Clear up after interaction end
                const s = on(window, ['mouseup', 'touchend', 'touchcancel'], () => {
                    off(...m);
                    off(...s);

                    // If hidden, which means the user wants to remove it, remove the current stop
                    if (hidden) {
                        this.removeStop(stop);
                        this._render(true);
                    }
                });
            }),
        };

        // this._focusedStop = stop;
        this.setFocusedStop(stop);
        this._stops.push(stop);

        this._pickr.setColor(color);
        color = this._pickr.getColor().toRGBA().toString(0);

        this._render(silent);
        return this;
    }

    setFocusedStop(stop) {
        this._stops.forEach((s) => {
            s.el.classList.contains(FOCUSED_STOP) && s.el.classList.remove(FOCUSED_STOP);
        });
        stop.el.classList.add(FOCUSED_STOP);
        this._focusedStop = stop;
    }

    /**
     * Removes a stop.
     * @param v Location, color or stop object
     */
    removeStop(v) {
        const { _stops } = this;

        const stop = (() => {
            if (typeof v === 'number') {
                return _stops.find((v) => v.loc === v);
            } else if (typeof v === 'string') {
                return _stops.find((v) => v.color === v);
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
            this.setFocusedStop(_stops[0]);
        }

        this._render();
    }

    clearStops() {
        this._stops.forEach((stop) => this.removeStop(stop));
    }

    replaceStops(stops) {
        if (stops) {
            this.clearStops();
            for (const [color, loc] of stops) {
                this.addStop(color, loc, true);
            }
        }
    }

    /**
     * Tries to parse a existing gradient string.
     * @param str gradient string
     */
    setGradient(str) {
        const parsed = parseGradient(str);

        if (!parsed || parsed.stops.length < 2) {
            return false;
        }

        const { type, stops, modifier } = parsed;
        const oldStops = [...this._stops];
        if (this._modes.includes(type)) {
            this._mode = type;

            // Apply new stops
            for (const stop of stops) {
                this.addStop(stop.color, stop.loc / 100);
            }

            // Remove current stops
            for (const stop of oldStops) {
                this.removeStop(stop);
            }

            if (type === 'linear') {
                this._angle = 180; // Default value
                modifier && this.setLinearAngle(modifier);
            } else if (type === 'radial') {
                this._direction = 'circle at center'; // Default value
                modifier && this.setRadialPosition(modifier);
            }

            return true;
        }

        return false;
    }

    /**
     * Returns the gradient as css background string
     * @returns {string}
     */
    getGradient(mode = this._mode) {
        const linearStops = this.getStops().toString(mode);

        switch (mode) {
            case 'linear':
                if (typeof this._angle === 'number')
                    return `linear-gradient(${this._angle}deg, ${linearStops})`;
                if (typeof this._angle === 'string')
                    return `linear-gradient(${this._angle}, ${linearStops})`;
                break;
            case 'radial':
                return `radial-gradient(${this._direction}, ${linearStops})`;
            case 'conic':
                return `conic-gradient(${linearStops})`;
        }
    }

    /**
     * Returns the current stops.
     * To toString function is overridden and returns the comma-joined version which
     * can be used to custimize the direction aka angle.
     * @returns {{color: *, location: *}[]}
     */
    getStops() {
        const stops = this._stops.map((v) => ({
            color: v.color,
            location: v.loc,
        }));

        const mode = this._mode;
        stops.toString = function (type = mode) {
            switch (type) {
                case 'linear':
                case 'radial':
                    return this.map((v) => `${v.color} ${v.location * 100}%`).join(',');
                case 'conic':
                    return this.map((v) => `${v.color} ${v.location * 360}deg`).join(',');
            }
        };

        return stops;
    }

    /**
     * Returns the current angle.
     * @returns {number}
     */
    getLinearAngle() {
        return this._mode === 'linear' ? this._angle : -1;
    }

    isValidDirectionString(dir) {
        const sideOrCorner = /^to (left (top|bottom)|right (top|bottom)|left|right|top|bottom)/i;
        const match = dir.match(sideOrCorner);
        return !!match;
    }

    /**
     * Sets a new angle, can be a number (degrees) or any valid css string like 0.23turn or "to bottom"
     * @param angle
     */
    setLinearAngle(angle) {
        angle = typeof angle === 'number' ? angle : this.isValidDirectionString(angle) && angle;

        if (typeof angle === 'number' || typeof angle === 'string') {
            this._angle = angle;
            this._render();
            return true;
        }

        return false;
    }

    /**
     * Sets a new radial position
     * @param position
     */
    setRadialPosition(position) {
        const pair = this._directions.find((v) => v.css === position);

        if (!pair) {
            return false;
        }

        this._direction = pair.css;

        // Apply class
        for (const child of Array.from(this._root.gradient.pos.children)) {
            child.classList[child.getAttribute('data-pos') === pair.pos ? 'add' : 'remove'](
                'gpcr-active'
            );
        }

        this._render();
        return true;
    }

    /**
     * Returns the current direction.
     * @returns {*}
     */
    getRadialPosition() {
        return this._mode === 'radial' ? this._direction : null;
    }

    setMode(mode) {
        this._mode = mode;
        this._render();
    }

    _emit(event, ...args) {
        this._eventListener[event].forEach((cb) => cb(...args, this));
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
