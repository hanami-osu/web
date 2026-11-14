export const primaryActionClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-transparent bg-accent px-5 py-2 text-sm leading-none font-medium text-ink no-underline transition-colors duration-150 hover:bg-accent-strong disabled:cursor-progress disabled:opacity-60 max-xs:w-full [&>span]:inline-flex [&>span]:items-center [&>span]:gap-2 [&_svg]:size-4 [&_svg]:shrink-0";

export const secondaryActionClass = "border-border bg-transparent text-text hover:border-accent/45 hover:bg-surface";

export const compactActionClass = "min-h-9 w-fit px-4 max-xs:w-full";

export const dangerOutlineActionClass =
    "border-danger/45 bg-transparent text-danger hover:border-danger hover:bg-danger/10 hover:text-danger-soft";

export const textButtonClass =
    "inline-flex w-fit items-center gap-[0.55rem] border-0 border-b border-current bg-transparent pb-1 text-[0.8rem] font-bold text-white disabled:cursor-progress disabled:opacity-60 [&_svg]:size-4";

export const formMessageClass = "my-4 flex items-center gap-[0.6rem] text-[0.82rem] text-muted [&_svg]:size-4.25 [&_svg]:shrink-0";

export const loadingInlineClass =
    "flex min-h-32.5 items-center justify-center gap-3 text-[0.85rem] text-muted [&_svg]:size-5 [&_svg]:animate-[spin_900ms_linear_infinite] motion-reduce:[&_svg]:animate-none";
