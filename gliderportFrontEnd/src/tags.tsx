/**
 * Example Utilities Module
 *
 * Demonstrates all of Microsoft’s standard TSDoc tags in one file.
 *
 * @packageDocumentation
 * @beta
 * @remarks
 *   This module is solely for demonstrating TSDoc tags.
 *   See {@link MathUtils} and {@link wrapInArray} for more examples.
 * @privateRemarks
 *   These details are for maintainers only and not shown publicly.
 */

/**
 * Configuration options for the system.
 *
 * @public
 */
export interface Config {
    /**
     * The server URL.
     *
     * @defaultValue "http://localhost"
     */
    readonly serverUrl?: string;
}

/**
 * @deprecated Use `NewType` instead.
 */
export type OldType = number;

/**
 * A new, improved type alias.
 */
export type NewType = number;

/**
 * Wraps a value in an array.
 *
 * @typeParam T - The type of the value.
 * @param value - The value to wrap.
 * @returns An array containing the value.
 */
export function wrapInArray<T>(value: T): T[] {
    return [value];
}

/**
 * Logs the execution time of a method.
 *
 * @param message - A custom message.
 * @returns A method decorator.
 * @public
 */
export function logExecution(message: string): MethodDecorator {
    return (
        target: Object,
        propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<any>
    ): TypedPropertyDescriptor<any> | void => {
        const original = descriptor.value as (...args: any[]) => any;
        descriptor.value = function (...args: any[]) {
            console.time(message);
            const result = original.apply(this, args);
            console.timeEnd(message);
            return result;
        };
        return descriptor;
    };
}

/**
 * A utility class for math operations.
 *
 * @sealed
 */
export class MathUtils {
    /**
     * Adds two numbers.
     *
     * @param a - The first addend.
     * @param b - The second addend.
     * @returns The sum of `a` and `b`.
     * @example
     * ```ts
     * const result = MathUtils.add(2, 3);
     * // result is 5
     * ```
     * @see MathUtils.divide
     */
    public static add(a: number, b: number): number {
        return a + b;
    }

    /**
     * Divides two numbers.
     *
     * @param a - The dividend.
     * @param b - The divisor.
     * @returns The quotient of `a` divided by `b`.
     * @throws Will throw an error if `b` is zero.
     */
    public static divide(a: number, b: number): number {
        if (b === 0) {
            throw new Error("Division by zero");
        }
        return a / b;
    }
}

/**
 * Base greeter class.
 *
 * @virtual
 */
export class Greeter {
    /**
     * Greets a person.
     *
     * @param name - The person’s name.
     * @returns A greeting string.
     */
    public greet(name: string): string {
        return `Hello, ${name}!`;
    }
}

/**
 * Advanced greeter with extra punctuation.
 *
 */
export class AdvancedGreeter extends Greeter {
    /**
     * @inheritDoc
     * @override
     */
    public greet(name: string): string {
        const base = super.greet(name);
        return `${base} Welcome aboard.`;
    }
}

/**
 * Callback for events.
 *
 * @eventProperty
 */
export type EventCallback = (data: any) => void;

/**
 * Event emitter for notifications.
 *
 * @public
 */
export class Notifier {
    /**
     * Fired when a notification occurs.
     *
     * @eventProperty
     */
    public onNotify?: EventCallback;

    /**
     * Sends a notification.
     *
     * @param message - The notification message.
     * @public
     */
    public notify(message: string): void {
        if (this.onNotify) this.onNotify(message);
    }
}

/**
 * Crucial function example.
 *
 * {@label IMPORTANT}
 * This function is crucial for system startup.
 */
export function crucialFunction(): void {
    console.log("Crucial operation executed");
}

/**
 * Initializes the system.
 *
 * @remarks
 * Must be called before other API functions.
 * @internal
 */
function initialize(): void {
    // internal setup logic
}

/**
 * Experimental feature.
 *
 * @experimental
 */
export function experimentalFeature(): void {
    console.log("This feature is experimental");
}
