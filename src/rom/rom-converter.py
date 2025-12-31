# csv_to_bin.py

input_file = "src/rom/sharp pc-1403 ROM.csv"
output_file = "src/rom/sharp pc-1403 ROM.rom"

bytes_out = bytearray()

with open(input_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue  # leere Zeilen überspringen

        parts = line.split(";")
        if len(parts) < 2:
            continue  # ungültige Zeilen überspringen

        try:
            value = int(parts[1])
        except ValueError:
            continue  # falls keine Zahl

        if not (0 <= value <= 255):
            raise ValueError(f"Byte-Wert außerhalb des Bereichs: {value}")

        bytes_out.append(value)

with open(output_file, "wb") as f:
    f.write(bytes_out)

print(f"{len(bytes_out)} Bytes erfolgreich nach '{output_file}' geschrieben.")
