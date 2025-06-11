/**
 * @packageDocumentation
 * FilterContext for the Gliderport application.
 * Provides filtering, smoothing, and interpolation utilities for sensor data.
 */
import React, { useEffect, useContext, createContext } from 'react'
import { Reading } from '@/contexts/DataContext'

export type Limits = {
    tsStart: number;
    tsStop: number;
    yMin: number;
    yMax: number;
};
export type FillReturnDataType = {
    filled: null | [number, number][][];
    limits: null | Limits;
};
export type FffReturnDataType = {
    filled: [number, number][];
    limits: null | Limits;
};
export type FilterReturnDataType = {
    filtered: [number, number][];
    fTop: [number, number][];
    fBottom: [number, number][];
    limits: null | Limits;
    filled: [number, number][];
};

/**
 * The shape of the FilterContext, providing filter and fill functions.
 */
interface FilterContextInterface {
    filterData: (rawData: Reading[], width: number) => FilterReturnDataType,
    fillForFilter: (data: Reading[], width: number, label: keyof Reading) => FffReturnDataType,
    fillData: (data: Reading[], width: number, label: keyof Reading) => FillReturnDataType,
}

const FilterContext = createContext<FilterContextInterface>({} as FilterContextInterface);

/**
 * Custom hook to access the FilterContext.
 * @returns {FilterContextInterface} The filter context.
 */
export function useFilter(): FilterContextInterface {
    return useContext(FilterContext)
}

/**
 * FilterProvider component that wraps its children with filter context.
 * Provides filtering, smoothing, and interpolation utilities for sensor data.
 * @param props - The children to provide context to.
 * @returns {React.ReactElement} The provider with filter context.
 */
export function FilterProvider({ children }: any): React.ReactElement {

    const [filter, setFilter] = React.useState<number[]>([])

    //  http://t-filter.engineerjs.com/    
    const filter11: number[] = [
        -0.08515745644422122,
        0.0379292561786139,
        0.09900577545371485,
        0.17567660801675092,
        0.23862805298056225,
        0.26269897977212336,
    ];

    // 50 tap filter 
    const filter50: number[] = [
        -0.0005519179729534347, 0.00022990491087123774, 0.000964556512193067, 0.0022138703609847045, 0.003878845712614388,
        0.005693192999363724, 0.00721855318134903, 0.007895582221179556, 0.007162749119392511, 0.004604203567927476,
        0.00012325138554789477, -0.005925557649769567, -0.012670720599984047, -0.01876694130424985, -0.022558133515158917,
        -0.022343507349748735, -0.016711913441114334, -0.004872771829500347, 0.013080901585374222, 0.03604862554699859,
        0.061976496641276003, 0.08809722110860864, 0.11132638621159739, 0.12874367244612944, 0.13807457440106205];




    // 100 tap filter  50/90/1000 (50 numbers as it's symmetrical)
    const filter100: number[] = [
        -0.00013939454546656245, 0.0013626915351227131, 0.001137183610719298, 0.0014717070174845809, 0.001899687436787478,
        0.0023658885321655525, 0.002849654086548567, 0.003329108224967885, 0.0037764258647993406, 0.004169102510364373,
        0.004473492218561496, 0.004661085969179788, 0.004702542172013141, 0.004571025365101064, 0.00424501427975504,
        0.0037099484328596733, 0.002957329176732867, 0.0019905422746565983, 0.000821758166975287, -0.0005245920883821428,
        -0.002012056061284271, -0.003592850952891556, -0.005208344870246151, -0.006789592514230388, -0.00826111402896158,
        -0.0095411937112149, -0.010546162344257964, -0.011193171469601491, -0.011403242340090058, -0.011105138253501288,
        -0.010239063979583596, -0.008758967232383268, -0.006636693870836969, -0.003863362979353387, -0.0004513550063352624,
        0.0035644980231275213, 0.008127256972077064, 0.013158627917118233, 0.018560128680089678, 0.02421643825062552,
        0.029997925799487044, 0.035764843809626516, 0.04137203957287865, 0.046673327631637535, 0.05152673232270508,
        0.05579967786768862, 0.0593731198539503, 0.06214641629190559, 0.0640407266214166, 0.06500163538254261];

    const filterSelect: number = 3


    useEffect(() => {
        // set the filter to the selected one
        var f = (filterSelect === 0) ? filter11 : (filterSelect === 2 ? filter50 : filter100);
        // f is your original 1-sided FIR kernel  (length N)
        const origSum = f.reduce((acc, v) => acc + v, 0);      // Σ of the left half
        const total = origSum * 2;                          // Σ of the mirrored pair

        const fullFilter = [...f, ...[...f].reverse()]         // mirror it
            .map(v => v / total);               // normalize to ∑ = 1

        setFilter(fullFilter);
    }, [])


    // fill and return the "filled" array with data
    function fillData(data: Reading[], width: number, label: keyof Reading): FillReturnDataType {
        // maximum of 'width' points
        // create array segments removing spans of > 15m of no data
        if (width === 0 || data?.length === 0) { return { filled: null, limits: null } }
        const l = label
        // debugger
        let min = data[0][l], max = data[0][l]

        var filled: [number, number][][] = []
        const tStart = data[0].time
        const tStop = data[data.length - 1].time
        const tDuration = tStop - tStart
        const stepSize = (tDuration) / width

        if (data.length < 2 || tStop === tStart) {
            return { filled: [], limits: null }
        }

        let step = tStart
        let j = 1
        let k = 0
        let i = 0
        let tk = data[k].time
        let tj = data[j].time
        let dk = data[k][l]
        let dj = data[j][l]
        filled[i] = []
        filled[i].push([data[0].time, data[0][l]])

        while (step <= tStop) {
            // find first data point after step  
            if ((j < data.length) && (step >= tj)) {
                k = j
                while ((j < data.length - 1) && (step >= data[j].time)) {
                    j++
                }
                tk = data[k].time
                tj = data[j].time
                dk = data[k][l]
                dj = data[j][l]
            }
            if (j < data.length) {
                // if it was longer than a 15 min jump  
                if (tj - step > 900) {
                    // start a new segment
                    i++
                    filled[i] = []
                    filled[i].push([tj, dj])
                    if (dj > max) max = dj
                    if (dj < min) min = dj
                    // go to step right after t[j]
                    step += stepSize * (1 + Math.floor((tj - step) / stepSize))
                } else {
                    // interpolate between k and j
                    const pt = dk + (dj - dk) * ((step - tk) / (tj - tk))
                    filled[i].push([Math.floor(step), pt])
                    if (pt > max) max = pt
                    if (pt < min) min = pt
                }
            }
            step += stepSize
        }
        if (label === "direction") {
            min = 0
            max = 450
        }
        if (label === "humidity") {
            min = min - 20 < 0 ? 0 : min - 20
            max = min + 20 > 100 ? 100 : max + 20
        }
        if (label === "pressure") {
            min -= 1
            max += 1
        }
        if (label === "temperature") {
            min -= 10
            max += 10
        }
        return { filled, limits: { tsStart: tStart, tsStop: step - stepSize, yMin: min, yMax: max } }
    }

    function fillForFilter(
        data: Reading[],
        width: number,
        label: keyof Reading
    ): FffReturnDataType {
        if (width <= 0 || data.length < 2) {
            return { filled: [], limits: null };
        }
        const w = width > 5000 ? 5000 : width; // max width

        const tStart = data[0].time;
        const tStop = data[data.length - 1].time;
        const step = (tStop - tStart) / (w - 1);

        let yMin = Infinity;
        let yMax = -Infinity;

        // build exactly width+1 time steps, map each to an interpolated [t, v]
        const filled = Array.from({ length: w }, (_, i) => {
            const t = tStart + step * i;

            // find the first data point with time > t
            const idx = data.findIndex(d => d.time > t);
            const b = idx > -1 ? data[idx] : data[data.length - 1];
            const a = idx > 0 ? data[idx - 1] : data[0];

            // linear interp, guard divide-by-zero
            const v =
                a.time === b.time
                    ? a[label]
                    : a[label] + (b[label] - a[label]) * ((t - a.time) / (b.time - a.time));

            yMin = Math.min(yMin, v);
            yMax = Math.max(yMax, v);

            return [t, v] as [number, number];
        });

        return {
            filled,
            limits: {
                tsStart: tStart,
                tsStop: tStop,
                yMin,
                yMax
            }
        };
    }


    function filterData(rawData: Reading[], width: number): FilterReturnDataType {
        var filtered: [number, number][] = []
        var { filled, limits }: FffReturnDataType = fillForFilter(rawData, width, "speed")

        // filter the data
        filled.forEach(function (v, i) {
            var g = 0
            var lastValid = -1
            if (filled[i][1] === -1) {
                filtered.push([v[0], 0])
                lastValid = -2
            } else {
                for (let j = 0; j < filter.length; j++) {
                    var k = i - filter.length / 2 + j;
                    if (k < 0) { k = 0 }
                    if (k >= filled.length) { k = filled.length - 1 }
                    if (filled[k][1] < 0) {
                        if (lastValid === -1) {
                            lastValid = k - 1
                        }
                        g += filter[j] * filled[lastValid][1]
                    } else {
                        g += filter[j] * filled[k][1];
                    }
                    if (g < 0) { g = 0 }
                }
                filtered.push([v[0], g])
            }
        })
        //find the spread
        const range = 300 // seconds to look forward and back for min/max
        var top: [number, number][] = []
        var bottom: [number, number][] = []
        var l = 0, h = 0
        filled.forEach(function (v, i) {
            while ((h < (filled.length - 1)) && ((v[0] + range) > filled[h][0])) { h++ }
            while ((l < (filled.length - 1)) && ((v[0] - range) > filled[l][0])) { l++ }
            var max = 0
            var min = 100
            for (let i = l; i <= h; i++) {
                if (filled[i][1] > max) { max = filled[i][1] }
                if (filled[i][1] < min) { min = filled[i][1] }
            }

            if (max < 0) { max = 0 }
            if (min < 0) { min = 0 }
            if (min > max) { min = max }
            top.push([v[0], max])
            bottom.push([v[0], min])
        })
        var fTop: [number, number][] = []
        var fBottom: [number, number][] = []

        top.forEach(function (v, i) {
            var g = 0;
            for (let j = 0; j < filter.length; j++) {
                var k = i - filter.length / 2 + j;
                if (k < 0) { k = 0 }
                if (k >= top.length) { k = top.length - 1 }
                g += filter[j] * top[k][1];
            }
            if (g < 0) { g = 0 }
            fTop.push([v[0], g])
        })
        bottom.forEach(function (v, i) {
            var g = 0;
            for (let j = 0; j < filter.length; j++) {
                var k = i - filter.length / 2 + j;
                if (k < 0) { k = 0 }
                if (k >= bottom.length) { k = bottom.length - 1 }
                g += filter[j] * bottom[k][1];
            }
            if (g < 0) { g = 0 }
            fBottom.push([v[0], g])
        })

        return ({ filtered, fTop, fBottom, limits, filled });
    }


    const value = {
        filterData,
        fillForFilter,
        fillData,
    }

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    )
}
