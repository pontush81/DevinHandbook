# Jupyter Notebooks

Den här mappen innehåller Jupyter notebooks för data analys och prototyping.

## Kom igång

### Starta Jupyter Notebook
```bash
jupyter notebook
```

### Starta Jupyter Lab (modernare interface)
```bash
jupyter lab
```

### Installera nödvändiga bibliotek
```bash
pip3 install jupyter pandas numpy matplotlib seaborn ipywidgets
```

## Notebook filer

- `jupyter_guide.ipynb` - Grundläggande guide för att komma igång med Jupyter

## Viktiga kortkommandon

### Command Mode (blå cell)
- `Enter` - Växla till Edit mode
- `A` - Lägg till cell ovanför
- `B` - Lägg till cell nedanför
- `DD` - Ta bort cell
- `M` - Ändra till Markdown cell
- `Y` - Ändra till kod cell

### Edit Mode (grön cell)
- `Esc` - Växla till Command mode
- `Shift + Enter` - Kör cell och gå till nästa
- `Ctrl + Enter` - Kör cell och stanna kvar
- `Tab` - Kod autocompletion

## Best Practices

1. **Döp dina notebooks beskrivande** - använd datum och beskrivning
2. **Kör celler i ordning** - för att undvika konflikter
3. **Spara ofta** - med Ctrl+S
4. **Använd Markdown** - för dokumentation mellan kod
5. **Dela upp kod** - i små, logiska celler
6. **Använd `?` för hjälp** - t.ex. `print?` 