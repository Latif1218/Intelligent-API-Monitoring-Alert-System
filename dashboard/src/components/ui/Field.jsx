import { cn } from '../../lib/utils';
import styles from '../../styles/modules/pages/Management.module.scss';

/** Label + control + optional hint, used by every form on the management pages. */
export function Field({ label, htmlFor, hint, children }) {
    return (
        <div className={styles.field}>
            <label htmlFor={htmlFor}>{label}</label>
            {children}
            {hint && <span className={styles.hint}>{hint}</span>}
        </div>
    );
}

export function Select({ className, children, ...props }) {
    return (
        <select className={cn(styles.select, className)} {...props}>
            {children}
        </select>
    );
}
