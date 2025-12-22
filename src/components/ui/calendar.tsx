import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-6", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-3",
        caption_label: "text-base font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-wide",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200/60 p-0 hover:from-blue-100 hover:to-purple-100 hover:border-purple-300 hover:scale-110 transition-all duration-300 ease-out hover:shadow-lg shadow-purple-200/50 opacity-80 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1 mt-4",
        head_row: "flex gap-1",
        head_cell: "text-gray-500 rounded-lg w-10 font-bold text-xs uppercase tracking-wider",
        row: "flex w-full mt-1 gap-1",
        cell: cn(
          "h-10 w-10 text-center text-sm p-0 relative transition-all duration-200",
          "[&:has([aria-selected].day-range-end)]:rounded-r-2xl",
          "[&:has([aria-selected].day-outside)]:bg-gradient-to-br [&:has([aria-selected].day-outside)]:from-blue-100/40 [&:has([aria-selected].day-outside)]:to-purple-100/40",
          "[&:has([aria-selected])]:bg-gradient-to-br [&:has([aria-selected])]:from-blue-50 [&:has([aria-selected])]:to-purple-50",
          "first:[&:has([aria-selected])]:rounded-l-2xl",
          "last:[&:has([aria-selected])]:rounded-r-2xl",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-semibold rounded-2xl transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg aria-selected:opacity-100 relative overflow-hidden group"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 text-white font-bold",
          "hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 hover:text-white",
          "focus:from-blue-600 focus:via-purple-700 focus:to-pink-700 focus:text-white",
          "shadow-xl shadow-purple-500/50 scale-105 ring-2 ring-purple-200 ring-offset-2"
        ),
        day_today: cn(
          "bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-blue-700 font-bold",
          "ring-2 ring-blue-400/50 ring-offset-1",
          "hover:from-blue-200 hover:via-purple-200 hover:to-pink-200 hover:ring-blue-500"
        ),
        day_outside: cn(
          "day-outside text-gray-400 opacity-30",
          "aria-selected:bg-gradient-to-br aria-selected:from-blue-100/20 aria-selected:to-purple-100/20",
          "aria-selected:text-gray-400 aria-selected:opacity-30 hover:opacity-50"
        ),
        day_disabled: "text-gray-300 opacity-30 cursor-not-allowed hover:scale-100 hover:shadow-none",
        day_range_middle: cn(
          "aria-selected:bg-gradient-to-br aria-selected:from-blue-50 aria-selected:via-purple-50 aria-selected:to-pink-50",
          "aria-selected:text-blue-700 aria-selected:rounded-none"
        ),
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => (
          <ChevronLeft className="h-5 w-5 text-blue-600 transition-transform duration-300 group-hover:-translate-x-0.5" />
        ),
        IconRight: ({ ..._props }) => (
          <ChevronRight className="h-5 w-5 text-purple-600 transition-transform duration-300 group-hover:translate-x-0.5" />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };