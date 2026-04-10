/**
 * FIR (Finite Impulse Response) filter definitions and coefficient builder for wind data smoothing.
 *
 * Filter designs were generated at {@link http://t-filter.engineerjs.com/}.
 * Each entry stores only the left half (plus optional center tap) of the symmetric impulse
 * response; `getFilter` mirrors and normalises them to produce a unit-gain kernel ready
 * for convolution.
 *
 * @packageDocumentation filters
 */

/**
 * Describes one FIR filter design.
 */
type Filter = {
    /** Total number of taps (length of the full symmetric kernel). */
    taps: number;
    /** Left-half (and optional center) coefficients of the symmetric impulse response. */
    weights: number[];
};

/**
 * Library of pre-designed FIR low-pass filters at different tap counts and cut-off ratios.
 *
 * All designs assume Fs = 2000 Hz. Only the left half (and centre tap for odd-tap filters)
 * of each symmetric kernel is stored; `getFilter` mirrors and normalises on demand.
 *
 * | Index | Taps | Pass-band | Stop-band | Notes                          |
 * |-------|------|-----------|-----------|--------------------------------|
 * | 0     |  11  | 200 Hz    | 300 Hz    | Lightweight, ~10 % / 15 %      |
 * | 1     |  50  | —         | —         | Medium roll-off                |
 * | 2     | 100  | 50 Hz     | 90 Hz     | Default (`filterSelect = 2`)   |
 * | 3     | 100  | 100 Hz    | 200 Hz    | Wider pass-band alternative    |
 */
const filters: Filter[] =
    [{
        taps: 11, weights: [
            -0.08515745644422122, 0.0379292561786139, 0.09900577545371485, 0.17567660801675092, 0.23862805298056225,
            0.26269897977212336,
        ]
    },
    {
        taps: 50, weights: [
            -0.0005519179729534347, 0.00022990491087123774, 0.000964556512193067, 0.0022138703609847045, 0.003878845712614388,
            0.005693192999363724, 0.00721855318134903, 0.007895582221179556, 0.007162749119392511, 0.004604203567927476,
            0.00012325138554789477, -0.005925557649769567, -0.012670720599984047, -0.01876694130424985, -0.022558133515158917,
            -0.022343507349748735, -0.016711913441114334, -0.004872771829500347, 0.013080901585374222, 0.03604862554699859,
            0.061976496641276003, 0.08809722110860864, 0.11132638621159739, 0.12874367244612944, 0.13807457440106205,
        ]
    },
    // 100-tap filter  50/90/1000 — stored as 50 half-coefficients (symmetrical)
    {
        taps: 100, weights: [
            -0.00013939454546656245, 0.0013626915351227131, 0.001137183610719298, 0.0014717070174845809, 0.001899687436787478,
            0.0023658885321655525, 0.002849654086548567, 0.003329108224967885, 0.0037764258647993406, 0.004169102510364373,
            0.004473492218561496, 0.004661085969179788, 0.004702542172013141, 0.004571025365101064, 0.00424501427975504,
            0.0037099484328596733, 0.002957329176732867, 0.0019905422746565983, 0.000821758166975287, -0.0005245920883821428,
            -0.002012056061284271, -0.003592850952891556, -0.005208344870246151, -0.006789592514230388, -0.00826111402896158,
            -0.0095411937112149, -0.010546162344257964, -0.011193171469601491, -0.011403242340090058, -0.011105138253501288,
            -0.010239063979583596, -0.008758967232383268, -0.006636693870836969, -0.003863362979353387, -0.0004513550063352624,
            0.0035644980231275213, 0.008127256972077064, 0.013158627917118233, 0.018560128680089678, 0.02421643825062552,
            0.029997925799487044, 0.035764843809626516, 0.04137203957287865, 0.046673327631637535, 0.05152673232270508,
            0.05579967786768862, 0.0593731198539503, 0.06214641629190559, 0.0640407266214166, 0.06500163538254261,
        ]
    },
    // 100-tap filter  100/200/1000 — stored as 50 half-coefficients (symmetrical)
    {
        taps: 100, weights: [
            0.0018356013174504735, -0.002066562630488025, -0.001656736305998838, -0.00156006372856121, -0.0015796520914371423,
            -0.0016027330779229121, -0.0015615179701508818, -0.0014134683989900814, -0.0011335355187717618, -0.0007111191631016608,
            -0.00014858885838798602, 0.0005350711014598761, 0.001316366454082164, 0.0021412823494052994, 0.002970430755483745,
            0.003732066269450971, 0.004359143860764617, 0.0047892280958162035, 0.004955847012771515, 0.004801105812803503,
            0.0042857607754440055, 0.003391015774104847, 0.002119677873136027, 0.000497871090730823,
            -0.0014169814147827532, -0.0035441242175221887, -0.00576930950698846, -0.007961354718505332, -0.009970433419526479,
            -0.011634063532908585, -0.012790658814340548, -0.013283882087229068, -0.01297165870018522, -0.01173756435605708,
            -0.009498712705122953, -0.006212195713292745, -0.0018785729108438118, 0.0034493119566379525, 0.009672282113788422,
            0.0166420274746489, 0.024167689931759134, 0.03202406851096458, 0.03995603666597825,
            0.047693163697132196, 0.05496188048055664, 0.06149700113418129, 0.06705411261938748, 0.07142164778197045,
            0.07443213062134509, 0.0759669783496758,
        ]
    }
    ];

/**
 * Index into `filters` that selects the active filter design.
 * 0 = 11-tap, 1 = 50-tap, 2 = 100-tap 50/90 Hz (default), 3 = 100-tap 100/200 Hz.
 */
const filterSelect: number = 2;

/** The currently active filter design selected by `filterSelect`. */
const filter: Filter = filters[filterSelect];

/**
 * Builds and returns the full, normalised FIR kernel for the active filter.
 *
 * The stored half-coefficients are mirrored to produce a symmetric kernel:
 * `[left..., center?, ...left.reversed()]`.  The kernel is then divided by
 * its sum so that DC gain equals 1 (unit gain).
 *
 * @returns An array of `taps` normalised filter coefficients ready for convolution.
 *
 * @example
 * ```ts
 * import { getFilter } from 'contexts/filters';
 *
 * const kernel = getFilter();            // e.g. 100 coefficients for filter index 2
 * const smoothed = signal.map((v, i) =>
 *   kernel.reduce((acc, w, k) => acc + w * (signal[i - k + kernel.length / 2] ?? 0), 0)
 * );
 * ```
 */
export function getFilter(): number[] {
    const { taps, weights } = filter;
    const half = Math.floor(taps / 2);
    const left = weights.slice(0, half);
    const center = (taps % 2 === 1) ? [weights[half]] : [];
    const mirrored = [...left, ...center, ...left.slice().reverse()];

    const total = mirrored.reduce((acc, val) => acc + val, 0);
    return mirrored.map(w => w / total);
}
