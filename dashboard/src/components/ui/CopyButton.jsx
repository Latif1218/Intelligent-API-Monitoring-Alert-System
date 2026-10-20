import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './Button';

export function CopyButton({ value, label = 'Copy' }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API is unavailable on plain http (non-localhost): fall back to a prompt.
            window.prompt('Copy this value:', value);
        }
    };

    return (
        <Button type="button" size="sm" variant="outline" onClick={copy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Copied' : label}
        </Button>
    );
}
