/* eslint-disable no-console */
import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { parseToHSVA } from '@simonwep/pickr/src/js/utils/color';
import { HSVaColor } from '@simonwep/pickr/src/js/utils/hsvacolor';
import Gpickr from './gpickr';

const linearDirections = {
    TO_TOP: 'to top',
    TO_RIGHT: 'to right',
    TO_BOTTOM: 'to bottom',
    TO_LEFT: 'to left',
    TO_TOP_RIGHT: 'to top right',
    TO_TOP_LEFT: 'to top left',
    TO_BOTTOM_RIGHT: 'to bottom right',
    TO_BOTTOM_LEFT: 'to bottom left',
};

const colorToHexa = (color) => {
    const hsva = parseToHSVA(color);
    const hexa = HSVaColor(...hsva.values)
        .toHEXA()
        .toString();
    return { hexa, type: hsva.type };
};

const convertStopsToHexa = (stops) =>
    stops.map((stop) => ({ ...colorToHexa(stop.color), loc: stop.loc }));

// const areStopsEqual = (stops1, stops2) => {
//     if (!stops1 || !stops2 || stops1.length !== stops2.length) return false;
//     return stops1.every((stop, i) => stop.hexa === stops2[i].hexa && stop.loc === stops2[i].loc);
// };

const GradientPicker = ({ angle, mode, onChange, pickr, setAngle, setMode, stops }) => {
    const [gpickr, setGpickr] = useState();
    const [initialized, setInitialized] = useState(false);

    const gpickrRef = useRef(null);

    useEffect(() => {
        if (!mode) {
            mode = 'linear';
            if (setMode) setMode(mode);
        }
    }, []);

    useEffect(() => {
        if (gpickrRef) {
            setGpickr(
                new Gpickr({
                    el: '.gpickr',
                    angle,
                    mode,
                    stops,
                    pickr: {
                        ...pickr,
                    },
                }).on('init', () => {
                    setInitialized(true);
                })
            );
        }
    }, [gpickrRef]);

    const onGpickrChange = (inst) => {
        if (setAngle && inst._angle !== angle) setAngle(inst._angle);
        if (setMode && inst._mode !== mode) {
            setMode(inst._mode);
        }
        // const hexaStops = convertStopsToHexa(inst._stops);
        // setStops(hexaStops);

        if (onChange) onChange(inst);
    };

    useEffect(() => {
        if (gpickr) {
            // TODO: pass details to change event, not just gpickr instance?
            if (onChange) gpickr.on('change', onGpickrChange);
        }
    }, [gpickr]);

    useEffect(() => {
        if (gpickr && initialized && gpickr._angle !== angle) {
            gpickr.setLinearAngle(angle);
        }
    }, [gpickr, initialized, angle]);

    useEffect(() => {
        if (gpickr && initialized && gpickr._mode !== mode) {
            gpickr.setMode(mode);
        }
    }, [gpickr, initialized, mode]);

    return <div className="gpickr" ref={gpickrRef} />;
};

GradientPicker.propTypes = {
    angle: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    mode: PropTypes.string,
    setAngle: PropTypes.func,
    setMode: PropTypes.func,
    stops: PropTypes.arrayOf(
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
    ),
    pickr: PropTypes.shape({
        theme: PropTypes.string,
        swatches: PropTypes.arrayOf(PropTypes.string),
        lockOpacity: PropTypes.bool,
        palette: PropTypes.bool,
        preview: PropTypes.bool,
        opacity: PropTypes.bool,
        hue: PropTypes.bool,
        input: PropTypes.bool,
        hex: PropTypes.bool,
        rgba: PropTypes.bool,
        cmyk: PropTypes.bool,
        hsla: PropTypes.bool,
        hsva: PropTypes.bool,
        cancel: PropTypes.bool,
        clear: PropTypes.bool,
        save: PropTypes.bool,
    }),
};

GradientPicker.defaultProps = {
    pickr: {
        theme: 'nano',
    },
};
export { GradientPicker as default, linearDirections };
