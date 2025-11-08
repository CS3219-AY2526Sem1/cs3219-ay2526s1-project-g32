# Admin Pages

This directory contains admin-only pages for managing the PeerPrep application.

## Question Management (`/admin`)

A comprehensive interface for administrators to create, edit, and delete coding questions in the database.

### Features:

#### **Three Operation Modes:**

1. **Create Mode (Default)**
   - Add new coding questions to the database
   - All required fields must be filled
   - Form auto-resets after successful creation

2. **Edit Mode**
   - Load existing questions by slug (e.g., "two-sum") or ID
   - Smart detection: automatically determines if input is slug or ID
   - All fields pre-populated with current data
   - Optional validation: only modified fields need to be valid
   - Partial updates supported

3. **Delete Mode**
   - Remove questions permanently from the database
   - Search by slug or ID
   - Confirmation dialog with warning: "This action cannot be undone"
   - Shows question title for verification before deletion
   - Red alert styling for visual warning

#### **Technical Features:**
- **React Hook Form** integration for optimized form handling and validation
- **Real-time validation** with error messages
- **Hot reloading** enabled via Next.js dev mode
- **Admin authentication** - Only users with admin role can access
- **Toggle switches** - Easy switching between Create/Edit/Delete modes
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
   http://localhost:3000/admin
   ```

3. **Choose Operation Mode:**
   - Use toggle switches in the header to switch between modes
   - **Create/Edit Toggle:** Switch between creating and editing
   - **Delete Toggle:** Enable delete mode (disables create/edit)

4. **Create Mode:**
   - Fill in all required form fields
   - Enter a descriptive title
   - Create a URL-friendly slug (lowercase, hyphens only)
   - Write the full problem description
   - Select difficulty level
   - Add relevant topics (press Enter after each tag)
   - Optionally add starter code templates
   - Click "Create Question" to save

5. **Edit Mode:**
   - Enter a question slug (e.g., "two-sum") or ID in the search box
   - Click "Load" or press Enter
   - Form populates with existing question data
   - Modify any fields you want to update
   - Click "Update Question" to save changes

6. **Delete Mode:**
   - Enter a question slug or ID in the search box
   - Click "Delete Question" or press Enter
   - Review question details in confirmation dialog
   - Confirm deletion (warning: cannot be undone!)
   - Question is permanently removed

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

The page connects to the Question Service API:
- **Base URL:** `http://localhost:4003/api/v1/questions`
- **Endpoints:**
  - `POST /` - Create question
  - `GET /:id` - Get question by ID
  - `GET /slug/:slug` - Get question by slug (NEW!)
  - `PUT /:id` - Update question
  - `DELETE /:id` - Delete question
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
- [x] Authentication/authorization check (admin role) ✅
- [x] Question edit functionality ✅
- [x] Question delete functionality ✅
- [x] Slug-based search ✅
- [ ] Question list page with pagination
- [ ] Bulk import from CSV/JSON
- [ ] Preview markdown rendering
- [ ] Code syntax highlighting in starter code inputs
- [ ] Image upload support for descriptions
- [ ] Question versioning/history
