# Digital Handbook Template

## Overview
This feature provides a digital handbook template for housing associations (bostadsrättsföreningar) to create, edit, and share professional handbooks. The implementation includes:

1. A display component for the handbook with print and PDF export functionality
2. An editable form component for inputting and updating handbook data
3. Print-optimized styling for both PDF and physical printing
4. Documentation and example usage

## Features
- 🖨️ Print-ready formatting
- 📱 Responsive design
- 📄 PDF export
- ✏️ Interactive editing
- 🎨 Professional styling with color-coded sections
- 📊 Visual hierarchy with icons and badges
- 📚 Complete handbook structure with all needed sections

## Quick Start
To test the handbook template:

1. Navigate to `/handbook-template` in the browser
2. Switch between "Förhandsgranskning" and "Redigera handbok" tabs
3. Make changes in the edit mode and preview them
4. Test the print functionality with the "Skriv ut" button
5. Test the PDF export with the "Ladda ner PDF" button

## Implementation Details
- Uses the `jspdf` library for PDF generation
- Uses `html2canvas` for capturing the handbook layout
- Implements custom print CSS for proper page breaks
- Utilizes shadcn/ui components for consistent UI

## Files
- `src/components/HandbookTemplate.jsx`: Main handbook display component
- `src/components/EditableHandbook.jsx`: Editable form component
- `src/app/handbook-template/page.jsx`: Example page implementation
- `documentation/handbok-template-manual.md`: Detailed documentation

## Future Enhancements
- Database integration for saving handbooks
- User permissions for editing
- Additional customization options
- Export to other formats (Word, HTML)
- Multi-language support

## Dependencies
- jsPDF: PDF generation library
- html2canvas: HTML to canvas conversion for PDF export

## Documentation
For more detailed information, see the [Handbook Template Manual](./handbok-template-manual.md). 