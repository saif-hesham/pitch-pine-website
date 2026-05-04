import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabase';
import { Upload, Trash, Plus, Image as ImageIcon, Loader2, LogOut, ArrowRight } from 'lucide-react';

export default function AdminGallery() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setFiles((prev) => [...prev, ...selectedFiles]);

    // Generate previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || files.length === 0) return alert('الرجاء إدخال عنوان واختيار صور للمشروع.');

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedImageUrls = [];

      // Upload each file
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

      // Save to database
      const { error: dbError } = await supabase
        .from('projects')
        .insert([{
          title,
          description,
          images: uploadedImageUrls,
          cover_index: 0
        }]);

      if (dbError) throw dbError;

      // Reset form & refresh
      setIsAdding(false);
      setTitle('');
      setDescription('');
      setFiles([]);
      setPreviews([]);
      fetchProjects();

    } catch (error) {
      alert(`حصل خطأ أثناء الرفع: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProject = async (id, imageUrls) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشروع؟')) return;

    try {
      // Delete images from storage first
      for (const url of imageUrls) {
        // extract filename from public URL (last part after /)
        const parts = url.split('/');
        const fileName = parts[parts.length - 1];
        if (fileName) {
          await supabase.storage.from('project-images').remove([fileName]);
        }
      }

      // Delete from DB
      await supabase.from('projects').delete().eq('id', id);
      fetchProjects();
    } catch (err) {
      alert('خطأ أثناء الحذف');
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-sans"
            >
              تسجيل خروج
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-12">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-heading font-bold">معرض المشاريع</h2>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-background font-bold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة مشروع
            </button>
          )}
        </div>

        {/* Add Project Form */}
        {isAdding && (
          <div className="bg-surface border border-primary/10 rounded-[2rem] p-8 mb-12 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 mt-10">
            <h3 className="text-xl font-heading font-bold mb-6">مشروع جديد</h3>

            <form onSubmit={handlePublish} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-sans text-primary/60 mb-2">عنوان المشروع</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثل: مطبخ فيلا الياسمين"
                    className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-sans text-primary/60 mb-2">وصف مختصر</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="التفاصيل أو المواد المستخدمة..."
                    className="w-full bg-background border border-primary/10 rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors h-[50px] min-h-[50px] resize-y"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-sans text-primary/60 mb-2">صور المشروع</label>
                <div className="border-2 border-dashed border-primary/20 rounded-2xl p-8 text-center bg-background/50 hover:bg-background transition-colors relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="pointer-events-none flex flex-col items-center gap-3">
                    <Upload className="w-8 h-8 text-primary/40" />
                    <div>
                      <p className="text-primary/80 font-sans">اسحب الصور هنا أو انقر للاختيار</p>
                      <p className="text-sm text-primary/40 mt-1">يُفضل رفع صور بجودة عالية (JPG/PNG)</p>
                    </div>
                  </div>
                </div>

                {previews.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {previews.map((preview, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden aspect-square border border-primary/10">
                        <img src={preview} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 hover:text-red-500"
                        >
                          <Trash className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-primary/5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={uploading}
                  className="px-6 py-3 rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading || files.length === 0}
                  className="flex-1 bg-accent text-background font-bold py-3 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      جاري الرفع... {uploadProgress}%
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
            {projects.map(project => (
              <div key={project.id} className="bg-surface rounded-2xl overflow-hidden border border-primary/10 shadow-lg group">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={project.images[project.cover_index || 0] || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop'}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono border border-primary/10">
                    {project.images.length} صور
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-heading font-bold mb-2 line-clamp-1">{project.title}</h3>
                  <p className="text-primary/60 text-sm mb-6 line-clamp-2 min-h-[40px]">{project.description}</p>

                  <div className="flex justify-end gap-3 pt-4 border-t border-primary/5">
                    <button
                      onClick={() => handleDeleteProject(project.id, project.images)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <Trash className="w-4 h-4" />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
