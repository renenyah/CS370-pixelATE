'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [assignments, setAssignments] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setAssignments(data.assignments || []);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditForm({ ...assignments[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const saveEdit = () => {
    const updatedAssignments = [...assignments];
    updatedAssignments[editingIndex] = editForm;
    setAssignments(updatedAssignments);
    setEditingIndex(null);
    setEditForm({});
  };

  const deleteAssignment = (index) => {
    const updatedAssignments = assignments.filter((_, i) => i !== index);
    setAssignments(updatedAssignments);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📚 Syllabus Parser
          </h1>
          <p className="text-gray-600 mb-8">
            Upload your syllabus PDF and AI will extract all assignments and due dates
          </p>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <div className="text-4xl">📄</div>
                  <div className="text-sm text-gray-600">
                    {file ? file.name : 'Click to select a PDF file'}
                  </div>
                </div>
              </label>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Processing with AI...' : 'Upload & Parse with AI'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {assignments && assignments.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-green-800">
                    ✓ Found {assignments.length} Assignment{assignments.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm text-gray-600">Click Edit to fix any mistakes</p>
                </div>
                
                <div className="space-y-4">
                  {assignments.map((assignment, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      {editingIndex === index ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Assignment Name
                            </label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={editForm.dueDate}
                              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="homework">Homework</option>
                              <option value="exam">Exam</option>
                              <option value="project">Project</option>
                              <option value="reading">Reading</option>
                              <option value="activity">Activity</option>
                            </select>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={saveEdit}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-800">{assignment.name}</h3>
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                              {assignment.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                          <p className="text-sm font-medium text-indigo-600 mb-3">
                            📅 Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(index)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteAssignment(index)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-green-200">
                  <button
                    onClick={() => alert('Next: Save to database! (Coming soon)')}
                    className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Save All Assignments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
