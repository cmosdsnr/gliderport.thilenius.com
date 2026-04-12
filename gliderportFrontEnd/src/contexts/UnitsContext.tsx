/**
 * @packageDocumentation
 * Persists the user's preferred speed unit in localStorage.
 * Provides a formatter so every component uses consistent display strings.
 */
import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'pref_speed_unit';

export type SpeedUnit = 'mph' | 'kmh' | 'fts' | 'ms';

export const SPEED_UNITS: { key: SpeedUnit; label: string; factor: number }[] = [
    { key: 'mph', label: 'mph',  factor: 1 },
    { key: 'kmh', label: 'km/h', factor: 1.60934 },
    { key: 'fts', label: 'ft/s', factor: 1.46667 },
    { key: 'ms',  label: 'm/s',  factor: 0.44704 },
];

interface UnitsContextType {
    unit: SpeedUnit;
    setUnit: (u: SpeedUnit) => void;
    /** Format a speed value (stored internally in mph) to the preferred unit string. */
    fmtSpeed: (mph: number | null | undefined) => string;
    speedLabel: string;
}

const UnitsContext = createContext<UnitsContextType>({
    unit: 'mph',
    setUnit: () => {},
    fmtSpeed: (mph) => mph == null ? '—' : `${mph.toFixed(1)} mph`,
    speedLabel: 'mph',
});

function loadUnit(): SpeedUnit {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SPEED_UNITS.some(u => u.key === saved)) return saved as SpeedUnit;
    return 'mph';
}

export function UnitsProvider({ children }: { children: React.ReactNode }) {
    const [unit, setUnitState] = useState<SpeedUnit>(loadUnit);

    function setUnit(u: SpeedUnit) {
        setUnitState(u);
        localStorage.setItem(STORAGE_KEY, u);
    }

    function fmtSpeed(mph: number | null | undefined): string {
        if (mph == null) return '—';
        const def = SPEED_UNITS.find(u => u.key === unit) ?? SPEED_UNITS[0];
        return `${(mph * def.factor).toFixed(1)} ${def.label}`;
    }

    const speedLabel = SPEED_UNITS.find(u => u.key === unit)?.label ?? 'mph';

    return (
        <UnitsContext.Provider value={{ unit, setUnit, fmtSpeed, speedLabel }}>
            {children}
        </UnitsContext.Provider>
    );
}

export const useUnits = () => useContext(UnitsContext);
