import type { ChangeEvent } from "react";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type DateTimeFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  kind: "date" | "time";
  min?: string;
  minimumDate?: Date;
  isValueAllowed?: (value: string) => boolean;
  onInvalidValue?: () => void;
  onChange: (value: string) => void;
};

type WebInputWithPicker = HTMLInputElement & {
  showPicker?: () => void;
};

export function DateTimeField({
  label,
  value,
  placeholder,
  kind,
  min,
  isValueAllowed,
  onInvalidValue,
  onChange
}: DateTimeFieldProps) {
  const inputRef = useRef<WebInputWithPicker | null>(null);

  const openPicker = () => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <View style={styles.inputCard}>
      <Text style={styles.inputLabel}>{label}</Text>

      <Pressable style={styles.selectorField} onPress={openPicker}>
        <Text style={[styles.selectorFieldText, !value && styles.selectorPlaceholder]}>{value || placeholder}</Text>

        <input
          ref={inputRef}
          type={kind}
          value={value}
          min={min}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            if (isValueAllowed && !isValueAllowed(nextValue)) {
              onInvalidValue?.();
              return;
            }

            onChange(nextValue);
          }}
          style={styles.hiddenInput as never}
          tabIndex={-1}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputCard: {
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#09A1A1"
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF"
  },
  selectorField: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  selectorFieldText: {
    width: "100%",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#18181B",
    textAlign: "center"
  },
  selectorPlaceholder: {
    color: "#A1A1AA"
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
    pointerEvents: "none"
  }
});
