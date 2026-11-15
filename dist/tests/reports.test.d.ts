interface DayLockInput {
    targetDate: string;
    closedDates: string[];
}
declare const checkDayLockedMath: (input: DayLockInput) => boolean;
interface DiscrepancyInput {
    actualGalla: number;
    expectedGalla: number;
}
declare const calculateDiscrepancyMath: (input: DiscrepancyInput) => number;
