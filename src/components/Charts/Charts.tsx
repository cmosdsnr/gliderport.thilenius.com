/**
 * Charts Component
 *
 * Renders a set of wind-related charts (speed/direction, temperature, pressure, humidity)
 * inside a FilterProvider context. It measures its container width to pass as a prop for
 * responsive chart rendering.
 *
 * @packageDocumentation
 */
import React, { useRef, useState, useEffect, HTMLAttributes } from 'react';
import { Row } from 'react-bootstrap';
import { FilterProvider } from 'contexts/FilterContext';
import WindChart from './WindChart';
import SimpleChart from './SimpleChart';

/**
 * Props for the Charts component. Pass any Row HTML attributes to customize layout.
 */
export interface ChartsProps extends HTMLAttributes<HTMLElement> { }

/**
 * Charts container component.
 *
 * @param props - Attributes forwarded to the underlying <Row> element.
 * @returns React.ReactElementA set of responsive chart components inside a filter context.
 */
export function Charts(props: ChartsProps): React.ReactElement {
    const { ...rest } = props;
    // Number of seconds passed since some reference (currently unused)
    const [passedSeconds, setPassedSeconds] = useState<number>(0);
    // Tracks the container width to inform chart sizing
    const [clientWidth, setClientWidth] = useState<number>(0);
    // Ref to the Row element for measuring width
    const rowRef = useRef<HTMLElement>(null);

    useEffect(() => {
        /**
         * Measure and update clientWidth on resize
         */
        const resizeAndDraw = (): void => {
            const container = rowRef.current;
            if (!container) {
                console.warn('Charts: container ref is null');
                return;
            }
            setClientWidth(container.clientWidth);
        };
        resizeAndDraw();
        window.addEventListener('resize', resizeAndDraw);
        return () => {
            window.removeEventListener('resize', resizeAndDraw);
        };
    }, []);

    return (
        <FilterProvider>
            <Row
                ref={rowRef}
                style={{ backgroundColor: 'rgb(240,255,255)' }}
                {...rest}
            >
                {/* Speed & direction chart */}
                <WindChart clientWidth={clientWidth} label="Speed (mph) & Dir (color)" />

                {/* Direction chart */}
                <SimpleChart clientWidth={clientWidth} label="Direction" />

                {/* Temperature chart */}
                <SimpleChart clientWidth={clientWidth} label="Temperature" />

                {/* Pressure chart */}
                <SimpleChart clientWidth={clientWidth} label="Pressure" />

                {/* Humidity chart */}
                <SimpleChart clientWidth={clientWidth} label="Humidity" />
            </Row>
        </FilterProvider>
    );
};

export default Charts;
