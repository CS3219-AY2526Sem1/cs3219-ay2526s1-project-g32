# Admin Pages

This directory contains admin-only pages for managing the PeerPrep application.

## Question Management

### Create Question (`/admin/questions`)

A form-based interface for administrators to create new coding questions in the database.

#### Features:
- **React Hook Form** integration for optimized form handling and validation
- **Real-time validation** with error messages
- **Hot reloading** enabled via Next.js dev mode
- Form fields:
  - Title (required)
  - Slug (required, URL-friendly)
  - Description (required, markdown supported)
  - Difficulty (required, Easy/Medium/Hard)
  - Topics (required, tag-based input)
  - Starter code for 5 languages (optional):
    - Python
    - JavaScript
    - Java
    - C++
    - C

#### Usage:

1. **Start the frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to:**
   ```
   http://localhost:3000/admin/questions
   ```

3. **Fill in the form fields:**
   - Enter a descriptive title
   - Create a URL-friendly slug (lowercase, hyphens only)
   - Write the full problem description
   - Select difficulty level
   - Add relevant topics (press Enter after each tag)
   - Optionally add starter code templates

4. **Submit:**
   - Click "Create Question" to save
   - Form resets automatically on success
   - Error messages display if validation fails

#### Hot Reloading:

Hot reloading is enabled by default in Next.js development mode:
- Any changes to the page component will automatically refresh
- Form state is preserved during hot reloads
- No additional configuration needed

#### Environment Setup:

Make sure your `.env.local` includes:
```bash
NEXT_PUBLIC_QUESTION_SERVICE_URL=http://localhost:4003/api/v1/questions
```

#### API Integration:

The form connects to the Question Service API:
- **Endpoint:** `POST /api/v1/questions`
- **Port:** 4003 (configurable)
- **CORS:** Must allow `http://localhost:3000`

Ensure the Question Service is running:
```bash
cd question_service
npm run dev
```

#### Styling:

The page uses the same theme and styling as other auth pages:
- Ant Design components with custom theme
- Consistent color scheme (Indigo primary)
- Dark mode by default
- Responsive layout

#### Future Enhancements:
- [ ] Authentication/authorization check (admin role)
- [ ] Question list/edit/delete pages
- [ ] Bulk import from CSV/JSON
- [ ] Preview markdown rendering
- [ ] Code syntax highlighting in starter code inputs
- [ ] Image upload support for descriptions
