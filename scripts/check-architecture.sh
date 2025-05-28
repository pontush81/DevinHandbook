#!/bin/bash

echo "🔍 Kontrollerar komponentarkitektur..."
echo ""

# Kontrollera gamla mallar
echo "📋 Kontrollerar mallar..."
SIMPLE_TEMPLATES=$(grep -r "simpleTemplate" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || true)
if [ -n "$SIMPLE_TEMPLATES" ]; then
    echo "❌ Hittade gamla simpleTemplate referenser:"
    echo "$SIMPLE_TEMPLATES"
    echo ""
else
    echo "✅ Inga gamla simpleTemplate referenser hittades"
    echo ""
fi

# Kontrollera gamla sidebar imports
echo "🔧 Kontrollerar sidebar imports..."
OLD_SIDEBAR=$(grep -r "import.*Sidebar" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v ModernSidebar | grep -v "ui/sidebar" || true)
if [ -n "$OLD_SIDEBAR" ]; then
    echo "❌ Hittade gamla Sidebar imports:"
    echo "$OLD_SIDEBAR"
    echo ""
else
    echo "✅ Alla sidebar imports använder moderna komponenter"
    echo ""
fi

# Kontrollera gamla layout imports
echo "📱 Kontrollerar layout imports..."
OLD_LAYOUT=$(grep -r "import.*HandbookLayout" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || true)
if [ -n "$OLD_LAYOUT" ]; then
    echo "❌ Hittade gamla HandbookLayout imports:"
    echo "$OLD_LAYOUT"
    echo ""
else
    echo "✅ Inga gamla HandbookLayout imports hittades"
    echo ""
fi

# Kontrollera att alla handböcker använder ModernHandbookClient
echo "📚 Kontrollerar HandbookClient användning..."
MODERN_CLIENT_USAGE=$(grep -r "ModernHandbookClient" src/app/ --include="*.tsx" 2>/dev/null | wc -l)
OLD_CLIENT_USAGE=$(grep -r "HandbookClient" src/app/ --include="*.tsx" 2>/dev/null | grep -v ModernHandbookClient | wc -l || echo "0")

echo "✅ ModernHandbookClient används på $MODERN_CLIENT_USAGE ställen"
if [ "$OLD_CLIENT_USAGE" -gt 0 ]; then
    echo "❌ Gamla HandbookClient används fortfarande på $OLD_CLIENT_USAGE ställen"
    grep -r "HandbookClient" src/app/ --include="*.tsx" 2>/dev/null | grep -v ModernHandbookClient || true
else
    echo "✅ Inga gamla HandbookClient referenser hittades"
fi
echo ""

# Kontrollera completeBRFHandbook användning
echo "🏢 Kontrollerar template användning..."
COMPLETE_TEMPLATE_USAGE=$(grep -r "completeBRFHandbook" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
echo "✅ completeBRFHandbook används på $COMPLETE_TEMPLATE_USAGE ställen"
echo ""

# Sammanfattning
echo "📊 Sammanfattning:"
echo "=================="
if [ -z "$SIMPLE_TEMPLATES" ] && [ -z "$OLD_SIDEBAR" ] && [ -z "$OLD_LAYOUT" ] && [ "$OLD_CLIENT_USAGE" -eq 0 ]; then
    echo "🎉 Alla kontroller godkända! Arkitekturen är modern och konsistent."
else
    echo "⚠️  Några problem hittades. Se detaljer ovan."
fi
echo ""
echo "📖 För mer information, se: documentation/component-architecture.md" 