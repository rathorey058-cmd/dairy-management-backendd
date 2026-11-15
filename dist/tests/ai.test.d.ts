interface ParseItem {
    namePattern: string;
    quantity: number;
}
declare const parseMessageRegex: (message: string) => ParseItem[];
declare const mapQueryCategory: (query: string) => "galla" | "milk" | "production" | "farmer" | "unknown";
