const inputTransition =
  "transition-[color,border-color,box-shadow] duration-150";

export default defineAppConfig({
  ui: {
    badge: {
      slots: {
        base: "transition-colors",
      },
    },
    button: {
      slots: {
        base: "hover:scale-[1.03] active:scale-[0.97] transition",
      },
    },
    checkbox: {
      slots: {
        base: inputTransition,
      },
    },
    colors: {
      neutral: "zinc",
      primary: "blue",
    },
    fileUpload: {
      slots: {
        base: inputTransition,
      },
    },
    input: {
      slots: {
        base: inputTransition,
      },
    },
    inputDate: {
      slots: {
        base: inputTransition,
      },
    },
    inputMenu: {
      slots: {
        base: inputTransition,
      },
    },
    inputNumber: {
      slots: {
        base: inputTransition,
      },
    },
    inputTags: {
      slots: {
        base: inputTransition,
      },
    },
    inputTime: {
      slots: {
        base: inputTransition,
      },
    },
    pageCard: {
      slots: {
        wrapper: "items-stretch",
      },
    },
    pinInput: {
      slots: {
        base: inputTransition,
      },
    },
    radioGroup: {
      slots: {
        base: inputTransition,
      },
    },
    select: {
      slots: {
        base: inputTransition,
      },
    },
    selectMenu: {
      slots: {
        base: inputTransition,
      },
    },
    slider: {
      slots: {
        track: inputTransition,
      },
    },
    switch: {
      slots: {
        base: inputTransition,
      },
    },
    table: {
      slots: {
        base: "table-fixed border-separate border-spacing-0",
        separator: "h-0",
        tbody: "[&>tr]:last:[&>td]:border-b-0",
        td: "border-b border-default",
        th: "py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r",
        thead: "[&>tr]:bg-elevated/50 [&>tr]:after:content-none",
      },
    },
    textarea: {
      slots: {
        base: inputTransition,
      },
    },
  },
});
