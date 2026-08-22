import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabase';
import { Upload, Trash, Plus, Image as ImageIcon, Loader2, LogOut, ArrowRight, Pencil, Star, Check, X } from 'lucide-react';

// Generate a URL-friendly slug from an Arabic (or any) title
const generateSlug = (title) => {
  return title
    .trim()
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/[^\p{L}\p{N}-]/gu, '')   // keep letters (Arabic/Latin), numbers, hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens
};

// Check Supabase for uniqueness and append -2, -3, etc. if needed
const generateUniqueSlug = async (title, excludeId = null) => {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase.from('projects').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    if (!data || data.length === 0) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
};

export default function AdminGallery() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form states (Add & Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // null when adding, project object when editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [existingImages, setExistingImages] = useState([]); // URLs of images already saved
  const [removedExistingImages, setRemovedExistingImages] = useState([]); // URLs deleted during edit to clean up in storage
  const [files, setFiles] = useState([]); // New File objects to upload
  const [previews, setPreviews] = useState([]); // Previews for new files
  const [coverIndex, setCoverIndex] = useState(0); // Index in combined images array [...existingImages, ...previews]
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
    setLoadingProjects(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Start adding a new project
  const startAddProject = () => {
    previews.forEach(p => URL.revokeObjectURL(p));
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setExistingImages([]);
    setRemovedExistingImages([]);
    setFiles([]);
    setPreviews([]);
    setCoverIndex(0);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Start editing an existing project
  const startEditProject = (project) => {
    previews.forEach(p => URL.revokeObjectURL(p));
    setEditingProject(project);
    setTitle(project.title || '');
    setDescription(project.description || '');
    setExistingImages(Array.isArray(project.images) ? [...project.images] : []);
    setRemovedExistingImages([]);
    setFiles([]);
    setPreviews([]);
    setCoverIndex(typeof project.cover_index === 'number' ? project.cover_index : 0);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Cancel form
  const cancelForm = () => {
    previews.forEach(p => URL.revokeObjectURL(p));
    setIsFormOpen(false);
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setExistingImages([]);
    setRemovedExistingImages([]);
    setFiles([]);
    setPreviews([]);
    setCoverIndex(0);
  };

  // Handle new file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setFiles((prev) => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  // Remove an existing image in edit mode
  const removeExistingImage = (index) => {
    const urlToRemove = existingImages[index];
    if (urlToRemove) {
      setRemovedExistingImages((prev) => [...prev, urlToRemove]);
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));

    // Adjust cover index
    setCoverIndex((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  // Remove a newly added file from list
  const removeNewFile = (index) => {
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));

    const combinedIdx = existingImages.length + index;
    setCoverIndex((prev) => {
      if (prev === combinedIdx) return 0;
      if (prev > combinedIdx) return prev - 1;
      return prev;
    });
  };

  // Save / Update project
  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalImages = existingImages.length + files.length;
    if (!title.trim()) {
      return alert('الرجاء إدخال عنوان للمشروع.');
    }
    if (totalImages === 0) {
      return alert('الرجاء إضافة صورة واحدة على الأقل للمشروع.');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImageUrls = [];

      // Upload each new file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-images')
          .getPublicUrl(filePath);

        uploadedImageUrls.push(publicUrl);
        setUploadProgress(Math.floor(((i + 1) / files.length) * 100));
      }

      // Combine existing images + newly uploaded URLs
      const finalImages = [...existingImages, ...uploadedImageUrls];
      const safeCoverIndex = Math.max(0, Math.min(coverIndex, finalImages.length - 1));

      if (editingProject) {
        // Delete removed existing images from storage (non-blocking if some fail)
        if (removedExistingImages.length > 0) {
          try {
            const fileNamesToDelete = removedExistingImages
              .map((url) => {
                const parts = url.split('/');
                return parts[parts.length - 1];
              })
              .filter(Boolean);

            if (fileNamesToDelete.length > 0) {
              await supabase.storage.from('project-images').remove(fileNamesToDelete);
            }
          } catch (storageErr) {
            console.warn('Storage cleanup notice:', storageErr);
          }
        }

        // Strategy: delete old row then re-insert with same id
        // This works because DELETE and INSERT both have RLS policies,
        // while UPDATE may not.
        const projectId = editingProject.id;
        const createdAt = editingProject.created_at;

        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (deleteError) throw deleteError;

        const insertPayload = {
          id: projectId,
          title: title.trim(),
          description: description.trim(),
          images: finalImages,
          cover_index: safeCoverIndex,
          slug: await generateUniqueSlug(title.trim(), projectId),
        };
        // Preserve original created_at if it exists
        if (createdAt) {
          insertPayload.created_at = createdAt;
        }

        const { data: reinsertedData, error: insertError } = await supabase
          .from('projects')
          .insert([insertPayload])
          .select();

        if (insertError) throw insertError;

        // Immediately update local projects list
        if (reinsertedData && reinsertedData.length > 0) {
          setProjects((prev) =>
            prev.map((p) => (p.id === projectId ? reinsertedData[0] : p))
          );
        }
      } else {
        // Create in database
        const slug = await generateUniqueSlug(title.trim());
        const { data: insertedData, error: dbError } = await supabase
          .from('projects')
          .insert([
            {
              title: title.trim(),
              description: description.trim(),
              images: finalImages,
              cover_index: safeCoverIndex,
              slug,
            },
          ])
          .select();

        if (dbError) throw dbError;

        if (insertedData && insertedData.length > 0) {
          setProjects((prev) => [insertedData[0], ...prev]);
        }
      }

      // Clean up object URLs
      previews.forEach((p) => URL.revokeObjectURL(p));

      // Reset form & refresh
      setIsFormOpen(false);
      setEditingProject(null);
      setTitle('');
      setDescription('');
      setExistingImages([]);
      setRemovedExistingImages([]);
      setFiles([]);
      setPreviews([]);
      setCoverIndex(0);

      // Background re-fetch to ensure sync with server
      fetchProjects();
    } catch (error) {
      console.error('Save error:', error);
      alert(`خطأ أثناء الحفظ:\n${error.message || error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProject = async (id, imageUrls) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشروع نهائياً؟')) return;

    try {
      // Delete images from storage first
      if (Array.isArray(imageUrls)) {
        for (const url of imageUrls) {
          const parts = url.split('/');
          const fileName = parts[parts.length - 1];
          if (fileName) {
            await supabase.storage.from('project-images').remove([fileName]);
          }
        }
      }

      // Delete from DB
      await supabase.from('projects').delete().eq('id', id);

      if (editingProject && editingProject.id === id) {
        cancelForm();
      }

      fetchProjects();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + (err.message || err));
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center p-6 text-primary" dir="rtl">
        <div className="w-full max-w-sm bg-surface p-12 rounded-[2.5rem] border border-primary/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-texture opacity-5 mix-blend-overlay pointer-events-none" />

          <div className="mb-14 text-center">
            <h2 className="text-3xl font-heading font-bold mb-2">دخول الإدارة</h2>
            <p className="text-primary/50 text-sm">قم بتسجيل الدخول لإدارة مشاريعك</p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-8 text-sm text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-6 w-full mt-8">
            {/* Email Group */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-sans font-medium text-primary/70">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background/50 border border-primary/10 rounded-2xl px-5 py-4 text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all text-left"
                dir="ltr"
              />
            </div>

            {/* Password Group */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-sans font-medium text-primary/70">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background/50 border border-primary/10 rounded-2xl px-5 py-4 text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all text-left"
                dir="ltr"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full bg-accent text-background font-bold py-4 rounded-2xl hover:bg-accent/90 transition-transform active:scale-[0.98] flex justify-center items-center shadow-lg shadow-accent/20 mb-4"
            >
              {loadingAuth ? <Loader2 className="animate-spin w-5 h-5" /> : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-primary/5">
            <Link to="/" className="block text-center text-primary/40 hover:text-primary transition-colors text-sm font-sans flex items-center justify-center gap-2 group">
              العودة للموقع
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary" dir="rtl">
      {/* Admin Navbar */}
      <nav className="border-b border-primary/10 bg-surface/50 backdrop-blur-md sticky top-0 z-40 mb-4">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="font-heading font-bold text-2xl">PITCH PINE <span className="text-accent text-lg">Admin</span></h1>
          </div>
          <div className="flex gap-8 items-center">
            <Link to="/" className="text-primary/60 hover:text-primary transition-colors text-sm font-sans flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              الموقع العام
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-sans cursor-pointer"
            >
              تسجيل خروج
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-16">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-heading font-bold">معرض المشاريع</h2>
            <p className="text-primary/50 text-sm mt-1">إدارة وتعديل مشاريع المطابخ المعروضة في الموقع</p>
          </div>
          {!isFormOpen && (
            <button
              onClick={startAddProject}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-background font-bold hover:bg-accent/90 transition-colors cursor-pointer shadow-lg shadow-accent/20"
            >
              <Plus className="w-5 h-5" />
              إضافة مشروع
            </button>
          )}
        </div>

        {/* Add / Edit Project Form */}
        {isFormOpen && (
          <div
            ref={formRef}
            className="bg-surface border border-primary/15 rounded-[2rem] p-8 mb-12 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 relative"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  {editingProject ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold">
                    {editingProject ? `تعديل المشروع: ${editingProject.title}` : 'مشروع جديد'}
                  </h3>
                  <p className="text-primary/50 text-xs mt-0.5">
                    {editingProject ? 'عدّل بيانات وصور المشروع واختر صورة الغلاف المناسبة' : 'أدخل بيانات المشروع الجديد وارفع الصور'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelForm}
                className="text-primary/40 hover:text-primary p-2 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-sans text-primary/70 mb-2 font-medium">عنوان المشروع <span className="text-accent">*</span></label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثل: مطبخ فيلا الياسمين"
                    className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-sans text-primary/70 mb-2 font-medium">وصف مختصر</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="التفاصيل أو المواد المستخدمة (مثل: خشب بيتش باين طبيعي مع رخام كوارتز)..."
                    className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors h-[50px] min-h-[50px] resize-y"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-sans text-primary/70 font-medium">
                    صور المشروع <span className="text-accent">*</span>
                  </label>
                  {(existingImages.length > 0 || previews.length > 0) && (
                    <span className="text-xs text-primary/50 font-sans flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                      انقر على أيقونة النجمة لتحديد صورة الغلاف
                    </span>
                  )}
                </div>

                {/* Existing Images (when editing) */}
                {existingImages.length > 0 && (
                  <div className="mb-6 bg-background/30 p-4 rounded-2xl border border-primary/5">
                    <p className="text-xs text-primary/60 font-sans font-medium mb-3">
                      الصور الحالية ({existingImages.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {existingImages.map((imgUrl, i) => {
                        const isCover = coverIndex === i;
                        return (
                          <div
                            key={imgUrl + i}
                            className={`relative group rounded-xl overflow-hidden aspect-square border transition-all ${
                              isCover ? 'border-accent ring-2 ring-accent/40 shadow-lg shadow-accent/10' : 'border-primary/10 hover:border-primary/30'
                            }`}
                          >
                            <img src={imgUrl} alt={`Existing ${i}`} className="w-full h-full object-cover" />

                            {/* Cover badge / button */}
                            <button
                              type="button"
                              onClick={() => setCoverIndex(i)}
                              className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[11px] font-sans font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isCover
                                  ? 'bg-accent text-background shadow-md'
                                  : 'bg-background/80 text-primary/70 opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-background'
                              }`}
                              title={isCover ? 'صورة الغلاف الحالية' : 'تعيين كصورة غلاف'}
                            >
                              <Star className={`w-3 h-3 ${isCover ? 'fill-current' : ''}`} />
                              {isCover ? 'الغلاف' : 'غلاف'}
                            </button>

                            {/* Delete existing image button */}
                            <button
                              type="button"
                              onClick={() => removeExistingImage(i)}
                              className="absolute bottom-2 left-2 p-1.5 rounded-md bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all cursor-pointer"
                              title="حذف هذه الصورة"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload Box for adding new photos */}
                <div className="border-2 border-dashed border-primary/20 rounded-2xl p-6 text-center bg-background/40 hover:bg-background/70 hover:border-accent/50 transition-all relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="pointer-events-none flex flex-col items-center gap-2">
                    <Upload className="w-7 h-7 text-accent" />
                    <div>
                      <p className="text-primary/90 font-sans font-medium text-sm">
                        {editingProject ? 'انقر لإضافة صور جديدة للمشروع أو اسحبها هنا' : 'اسحب الصور هنا أو انقر للاختيار'}
                      </p>
                      <p className="text-xs text-primary/40 mt-0.5">يُفضل رفع صور بجودة عالية (JPG/PNG/WEBP)</p>
                    </div>
                  </div>
                </div>

                {/* Newly Added Previews */}
                {previews.length > 0 && (
                  <div className="mt-4 bg-background/30 p-4 rounded-2xl border border-primary/5">
                    <p className="text-xs text-primary/60 font-sans font-medium mb-3">
                      الصور الجديدة المختارة ({previews.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {previews.map((preview, i) => {
                        const combinedIndex = existingImages.length + i;
                        const isCover = coverIndex === combinedIndex;
                        return (
                          <div
                            key={preview + i}
                            className={`relative group rounded-xl overflow-hidden aspect-square border transition-all ${
                              isCover ? 'border-accent ring-2 ring-accent/40 shadow-lg shadow-accent/10' : 'border-primary/10 hover:border-primary/30'
                            }`}
                          >
                            <img src={preview} alt={`Preview ${i}`} className="w-full h-full object-cover" />

                            {/* Cover badge / button */}
                            <button
                              type="button"
                              onClick={() => setCoverIndex(combinedIndex)}
                              className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[11px] font-sans font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isCover
                                  ? 'bg-accent text-background shadow-md'
                                  : 'bg-background/80 text-primary/70 opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-background'
                              }`}
                              title={isCover ? 'صورة الغلاف الحالية' : 'تعيين كصورة غلاف'}
                            >
                              <Star className={`w-3 h-3 ${isCover ? 'fill-current' : ''}`} />
                              {isCover ? 'الغلاف' : 'غلاف'}
                            </button>

                            {/* Remove new file button */}
                            <button
                              type="button"
                              onClick={() => removeNewFile(i)}
                              className="absolute bottom-2 left-2 p-1.5 rounded-md bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all cursor-pointer"
                              title="إزالة هذه الصورة"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-primary/10">
                <button
                  type="button"
                  onClick={cancelForm}
                  disabled={uploading}
                  className="px-6 py-3 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading || (existingImages.length === 0 && files.length === 0)}
                  className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-accent/20"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      جاري الرفع والحفظ... {files.length > 0 ? `${uploadProgress}%` : ''}
                    </>
                  ) : editingProject ? (
                    <>
                      <Check className="w-5 h-5" />
                      حفظ التعديلات
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      نشر المشروع
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects List */}
        {loadingProjects ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 bg-surface/30 rounded-[2rem] border border-primary/5">
            <ImageIcon className="w-16 h-16 mx-auto text-primary/20 mb-4" />
            <h3 className="text-xl text-primary/60 font-heading">لا يوجد مشاريع حتى الآن</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const isCurrentlyEditing = editingProject?.id === project.id;
              const safeCover = project.images && project.images.length > 0
                ? project.images[project.cover_index || 0] || project.images[0]
                : 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop';

              return (
                <div
                  key={project.id}
                  className={`bg-surface rounded-2xl overflow-hidden border transition-all duration-300 shadow-lg group ${
                    isCurrentlyEditing ? 'border-accent ring-2 ring-accent/40' : 'border-primary/10 hover:border-primary/20'
                  }`}
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-background/50">
                    <img
                      src={safeCover}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono border border-primary/10">
                      {project.images?.length || 0} صور
                    </div>
                    {isCurrentlyEditing && (
                      <div className="absolute top-4 left-4 bg-accent text-background px-3 py-1 rounded-full text-xs font-bold font-sans shadow-md">
                        قيد التعديل
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-heading font-bold mb-2 line-clamp-1">{project.title}</h3>
                    <p className="text-primary/60 text-sm mb-6 line-clamp-2 min-h-[40px] leading-relaxed">
                      {project.description || 'بدون وصف'}
                    </p>

                    <div className="flex justify-end items-center gap-2 pt-4 border-t border-primary/5">
                      <button
                        onClick={() => startEditProject(project)}
                        className="bg-primary/5 hover:bg-accent/20 text-primary hover:text-accent px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
                        title="تعديل بيانات وصور المشروع"
                      >
                        <Pencil className="w-4 h-4" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id, project.images)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm cursor-pointer"
                        title="حذف المشروع"
                      >
                        <Trash className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
