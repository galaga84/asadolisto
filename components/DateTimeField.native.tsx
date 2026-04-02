import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type DateTimeFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  kind: "date" | "time";
  minimumDate?: Date;
  isValueAllowed?: (value: string) => boolean;
  onInvalidValue?: () => void;
  onChange: (value: string) => void;
};

const formatDateLabel = (value: Date) => {
  const day = `${value.getDate()}`.padStart(2, "0");
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTimeLabel = (value: Date) => {
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

const parseDateValue = (value: string) => {
  const normalized = value.trim().replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map(Number);

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [first, second, third] = parts;
  const isIsoFormat = normalized.split("/")[0]?.length === 4;
  const year = isIsoFormat ? first : third;
  const month = second;
  const day = isIsoFormat ? third : first;

  return new Date(year, month - 1, day);
};

const getPickerValue = (kind: DateTimeFieldProps["kind"], value: string, minimumDate?: Date) => {
  const fallback = minimumDate ?? new Date();

  if (!value) {
    return fallback;
  }

  if (kind === "date") {
    return parseDateValue(value) ?? fallback;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if ([hours, minutes].some((part) => Number.isNaN(part))) {
    return fallback;
  }

  const nextValue = new Date();
  nextValue.setHours(hours, minutes, 0, 0);
  return nextValue;
};

export function DateTimeField({
  label,
  value,
  placeholder,
  kind,
  minimumDate,
  isValueAllowed,
  onInvalidValue,
  onChange
}: DateTimeFieldProps) {
  const [visible, setVisible] = useState(false);
  const [selectedValue, setSelectedValue] = useState(() => getPickerValue(kind, value, minimumDate));

  useEffect(() => {
    setSelectedValue(getPickerValue(kind, value, minimumDate));
  }, [kind, minimumDate, value]);

  const handleChange = (_event: DateTimePickerEvent, nextValue?: Date) => {
    setVisible(false);

    if (!nextValue) {
      return;
    }

    const nextLabel = kind === "date" ? formatDateLabel(nextValue) : formatTimeLabel(nextValue);

    if (isValueAllowed && !isValueAllowed(nextLabel)) {
      onInvalidValue?.();
      return;
    }

    setSelectedValue(nextValue);
    onChange(nextLabel);
  };

  return (
    <View style={styles.inputCard}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.selectorField} onPress={() => setVisible(true)}>
        <Text style={[styles.selectorFieldText, !value && styles.selectorPlaceholder]}>{value || placeholder}</Text>
      </Pressable>

      {visible ? (
        <DateTimePicker
          value={selectedValue}
          mode={kind}
          display="default"
          is24Hour={kind === "time"}
          minimumDate={kind === "date" ? minimumDate ?? new Date() : undefined}
          onChange={handleChange}
        />
      ) : null}
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
    justifyContent: "center"
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
  }
});
