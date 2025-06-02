# Editor.js Reload Problem - Lösning

## Problem

Du hade problem med reload när du använde Editor.js i applikationen. Detta berodde på flera faktorer:

### 1. Dependency Array Problem
- I `useEffect` för Editor.js initialisering fanns `editorData` i dependency array
- Detta medförde att editorn återinitialiserades vid varje innehållsuppdatering
- Resulterade i förlust av fokus och state

### 2. Multiple Initialization
- Editor.js kunde initialiseras flera gånger samtidigt
- Ingen flagga för att förhindra parallella initialiseringar
- Skapade konflikter och instabil editor-behavior

### 3. Incomplete Cleanup
- Otillräcklig cleanup vid unmount/rerender
- Editor instances lämnades kvar i minnet
- Skapade minnesläckor

### 4. Infinite Render Loop i ModernHandbookClient
- `updatePage`, `addPage`, `addSection` och `moveSection` funktioner hade direct dependencies på `handbookData.sections`
- Detta skapade cirkulära dependencies som triggade oändliga re-renders
- `visibleSections` beräknades på varje render utan memoization
- `stableCallbacks` useMemo hade instabila dependencies

### 5. EditorJS Readonly Loop
- onChange callback försökte spara content även i readonly mode
- "Editor's content can not be saved in read-only mode" fel skapade nya loopar
- Problematisk data-uppdatering med `clear()` och `blocks.render()` metoder

### 6. Local State Update Issue
- `updatePage` funktionen hade för strikt change detection
- Även när content sparades till database uppdaterades inte local state
- Användare såg inte sina ändringar efter reload

## Lösning

### EditorJSComponent.tsx fixes:
- **Dependency Fix**: Tog bort `editorData` från useEffect dependencies för att förhindra re-initialization
- **Initialization Control**: Lagt till `initializingRef` för att förhindra multipla samtidiga initialiseringar
- **Stable Callbacks**: Memoized `stableOnChange` med `useCallback` för stabilitet
- **Data Memoization**: Memoized `editorData` preparation med `useMemo`
- **Proper Cleanup**: Förbättrad cleanup med felhantering för `destroy()` metoden
- **Error Recovery**: Lagt till error recovery utan full page reload
- **Readonly Protection**: Lagt till kontroller för readonly mode i onChange, handleSave och handlePreview

### ModernHandbookClient.tsx fixes:
- **Functional State Updates**: Alla callback funktioner använder nu functional state updates istället för direct dependencies
- **Memoized Calculations**: `visibleSections` beräknas nu med `useMemo` istället för på varje render
- **Stable Dependencies**: Fixat `stableCallbacks` useMemo dependencies
- **Simplified Change Detection**: Tog bort för strikt change detection i `updatePage` som förhindrade state updates

### API Route fixes:
- **Empty JSON Handling**: Lagt till hantering av tomma request bodies
- **Better Error Logging**: Förbättrad felhantering och logging för debugging

## Teknisk Implementation

### Innan (Problematisk kod):
```typescript
// ❌ Skapade infinite loops
const updatePage = useCallback(async (pageId: string, updates: Partial<Page>) => {
  // Direct dependency på handbookData.sections
  const section = handbookData.sections.find(s => 
    s.pages?.some(p => p.id === pageId)
  );
}, [handbookData.sections]); // ❌ Instabil dependency

// ❌ Readonly errors
onChange: stableOnChange ? async (api, event) => {
  const data = await api.saver.save(); // ❌ Fungerade inte i readonly
  stableOnChange(data);
}

// ❌ För strikt change detection
if (!hasActualChanges) {
  return prev; // ❌ Hoppade över nödvändiga updates
}
```

### Efter (Lösning):
```typescript
// ✅ Functional state updates förhindrar loops
const updatePage = useCallback(async (pageId: string, updates: Partial<Page>) => {
  setHandbookData(prev => {
    const newSections = prev.sections.map(section => {
      const hasPage = section.pages?.some(page => page.id === pageId);
      if (!hasPage) return section;
      
      return {
        ...section,
        pages: (section.pages || []).map(page =>
          page.id === pageId ? { ...page, ...updates } : page
        )
      };
    });
    
    return { ...prev, sections: newSections };
  });
}, []); // ✅ Tom dependency array

// ✅ Readonly skydd
onChange: stableOnChange && !readonly ? async (api, event) => {
  if (!readonly && api.readOnly === false) {
    const data = await api.saver.save();
    stableOnChange(data);
  }
}

// ✅ Alltid uppdatera state när det behövs
console.log('[ModernHandbookClient] Local page state updated successfully');
return { ...prev, sections: newSections };
```

## Resultat

### ✅ Fixade Problem:
1. **Ingen mer infinite render loop** - ModernHandbookClient renderar stabilt
2. **Ingen mer EditorJS readonly loop** - Korrekt readonly hantering
3. **Stabil editor experience** - Ingen förlust av fokus vid redigering
4. **Proper memory management** - Rätt cleanup av Editor.js instances
5. **API error handling** - Bättre hantering av empty requests
6. **Local state persistence** - Sparade ändringar syns direkt i UI

### ✅ Performance Förbättringar:
- Optimerade re-renders genom memoization
- Stabila callback dependencies
- Förhindrade onödiga re-initialiseringar
- Effektiv state management

### ✅ User Experience:
- Smidig editing utan loopar
- Snabb respons vid sparning
- Konsistent beteende mellan edit/view modes
- Inga konstiga reloads eller fokus-förluster

## Best Practices Lärdomar

1. **Använd functional state updates** för att undvika cirkulära dependencies
2. **Memoize tungt kalkulerade värden** som beräknas från state
3. **Undvik direct object references** i useCallback/useMemo dependencies
4. **Kontrollera readonly state** innan API-anrop i editors
5. **Implementera proper cleanup** för tredjepartsbibliotek
6. **Använd stabila callbacks** för att förhindra onödiga re-renders
7. **Ha försiktig change detection** - för strikt kan blockera nödvändiga updates

## Debugging Tips

### Identifiera Render Loops:
```typescript
console.log('🎯 Component render state:', {
  timestamp: new Date().toISOString(), // Se om detta växer snabbt
  // ... andra state values
});
```

### React DevTools Profiler:
- Använd för att identifiera komponenter som re-renderar ofta
- Leta efter "cascade effects" i component tree

### Dependency Debugging:
```typescript
// Lägg till i useEffect/useMemo för att se vad som triggar changes
useEffect(() => {
  console.log('Effect triggered by dependency change');
}, [dep1, dep2]);
```

## Testning

Vi har lagt till omfattande tester för reload-scenariot:
- ✅ Proper cleanup on unmount
- ✅ Prop changes without re-initialization  
- ✅ Content updates via render method
- ✅ Prevention of multiple simultaneous initializations
- ✅ Error handling and recovery
- ✅ **Render loop prevention**
- ✅ **Functional state update scenarios**

## Tips för framtiden

- Övervaka dependency arrays i useEffect
- Använd React DevTools Profiler för att identifiera onödiga re-renders
- Testa editor-komponenterna under olika reload-scenarion
- Implementera logging för att spåra initialization/cleanup cycles
- **Använd functional state updates för alla async operations**
- **Undvik direkta state-referenser i callback dependencies**
- **Memoize dyra beräkningar och callback-objekt** 