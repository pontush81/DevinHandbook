# Handbok Template Documentation

## Overview
The digital handbook template is a comprehensive solution for housing associations (bostadsrättsföreningar) to create, edit, and share professional handbooks. This documentation explains the components, features, and usage of the template system.

## Components

### 1. HandbookTemplate
`HandbookTemplate.jsx` is the display component that renders a formatted handbook with all sections and content based on the provided data.

#### Features:
- **Print Functionality**: Users can print the handbook directly from the browser
- **PDF Export**: The handbook can be exported as a PDF file using jsPDF and html2canvas
- **Structured Layout**: Content is organized into logical sections with consistent styling
- **Visual Hierarchy**: Uses color-coding, icons, and typography to prioritize information
- **Responsive Design**: Adapts to different screen sizes
- **Print-Optimized**: Special styles for printed output

### 2. EditableHandbook
`EditableHandbook.jsx` provides a form interface for users to input and edit their handbook data.

#### Features:
- **Form-Based Editing**: Input fields for all handbook content
- **Preview Mode**: Switch between editing and preview modes
- **Section-Based Organization**: Logically grouped form fields
- **Data Validation**: Ensures correct data format
- **Save Functionality**: Saves the handbook data

## Implementation Details

### PDF Export
The PDF export functionality uses:
- `html2canvas` to capture each section of the handbook
- `jsPDF` to create a properly formatted PDF document
- Custom scaling and optimization for improved quality
- Proper A4 formatting for professional output
- Error handling for robustness

```javascript
// Example of PDF export implementation
const exportToPDF = async () => {
  // Create canvas from each section
  const contentSections = handbookElement.querySelectorAll('section, .cover-page, .toc-page, footer')
  const canvases = []
  
  for (const section of contentSections) {
    const canvas = await html2canvas(section, options)
    canvases.push(canvas)
  }
  
  // Create PDF with A4 dimensions
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // Add each canvas as a new page
  canvases.forEach((canvas, index) => {
    // Add new page for all pages except the first one
    if (index > 0) pdf.addPage()
    
    const imgData = canvas.toDataURL('image/jpeg', 0.9)
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
  })
  
  // Save the PDF
  pdf.save(`${associationName}_Handbok.pdf`)
}
```

### Print Optimization
Special CSS classes ensure optimal printing:

- `print:break-before-page`: Forces page breaks at section starts
- `print:shadow-none`: Removes shadows in printed version
- `print:border`: Adds visible borders for printed content
- `print:bg-white`: Ensures white backgrounds for printing
- `no-print`: Hides elements that shouldn't be printed

## CSS Structure
The global CSS includes specific styles for handbook printing:

```css
@media print {
  .no-print {
    display: none !important;
  }
  
  body {
    font-size: 12pt !important;
    line-height: 1.4 !important;
    color: black !important;
    background: white !important;
  }
  
  .print\:break-before-page {
    break-before: page;
  }
  
  /* Other print-specific styles */
}
```

## Usage Guide

### Basic Implementation
1. Import the HandbookTemplate component:
   ```jsx
   import HandbookTemplate from '@/components/HandbookTemplate';
   ```

2. Provide handbook data as props:
   ```jsx
   <HandbookTemplate handbookData={handbookData} />
   ```

### Editing Mode
1. Import the EditableHandbook component:
   ```jsx
   import EditableHandbook from '@/components/EditableHandbook';
   ```

2. Implement a save handler:
   ```jsx
   const handleSave = (data) => {
     // Save handbook data to database or state
     setHandbookData(data);
   };
   ```

3. Render the editable component:
   ```jsx
   <EditableHandbook 
     initialData={handbookData} 
     onSave={handleSave} 
   />
   ```

### Example Page
See `src/app/handbook-template/page.jsx` for a complete implementation with:
- Tab interface to switch between preview and edit modes
- Example data loading
- Save functionality

## Data Structure
The handbook template expects a data object with the following properties:

```javascript
{
  // Basic information
  associationName: "Brf Eksemplet",
  address: "Exempelgatan 123, 123 45 Stockholm",
  orgNumber: "769999-1234",
  phone: "08-123 45 67",
  email: "info@brfeksemplet.se",
  
  // Association details
  foundedYear: "1985",
  totalApartments: "45",
  totalShares: "4500",
  propertyArea: "3200 kvm",
  aboutAssociation: "Description of the association...",
  purpose: "Association purpose statement...",
  
  // Board information
  boardMembers: [
    { role: "Ordförande", name: "Anna Andersson", contact: "...", term: "2024-2025" },
    // Additional board members...
  ],
  boardMeetingTime: "First Tuesday of each month, 19:00",
  boardMeetingPlace: "Association premises",
  
  // Financial information
  monthlyFeePerSqm: "45",
  dueDate: "Last business day of each month",
  invoicing: "Monthly via email",
  bankgiro: "123-4567",
  
  // Contact information
  emergencyPhone: "08-555 12 34",
  maintenanceEmail: "felanmalan@forening.se",
  boardEmail: "styrelsen@forening.se",
  
  // Additional fields as needed...
}
```

## Extending the Template
To add new sections or fields:

1. Update the `HandbookTemplate.jsx` component with new sections
2. Add corresponding fields to the `EditableHandbook.jsx` component
3. Ensure proper typing and default values for new fields
4. Add any needed styling in globals.css

## Dependencies
- jsPDF: PDF generation library
- html2canvas: HTML to canvas conversion for PDF export
- React: Frontend framework
- Tailwind CSS: Styling
- shadcn/ui: UI component library

## Troubleshooting
- **PDF Export Issues**: Check browser console for errors, ensure no CORS issues with images
- **Print Layout Problems**: Verify print-specific CSS classes are applied
- **Form Validation Errors**: Check data types and required fields
- **Performance Issues**: Large handbooks may need optimization for PDF export 