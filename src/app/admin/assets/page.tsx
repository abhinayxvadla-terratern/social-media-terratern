"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Asset, Page } from "@/lib/types";
import { useAdmin } from "@/contexts/AdminContext";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import {
  Upload,
  FolderDown,
  FileText,
  Trash2,
  Paperclip,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/client-cache";

export default function AssetsManagementPage() {
  const { userRole, canEdit } = useAdmin();
  const supabase = createClient();

  const cachedAssets = getCachedData<Asset[]>("admin_assets");
  const cachedPages = getCachedData<Page[]>("admin_pages_brief");

  const [assets, setAssets] = useState<Asset[]>(() => cachedAssets || []);
  const [pages, setPages] = useState<Page[]>(() => cachedPages || []);
  const [loading, setLoading] = useState(() => !cachedAssets);
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [customAssetName, setCustomAssetName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Attach to Page State
  const [attachAsset, setAttachAsset] = useState<Asset | null>(null);
  const [selectedPageToAttach, setSelectedPageToAttach] = useState<string>("");
  const [isAttaching, setIsAttaching] = useState(false);

  // Delete Confirm State
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Signed URL State
  const [signedUrlData, setSignedUrlData] = useState<{ url: string; name: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchAssetsAndPages = async () => {
    try {
      if (!cachedAssets) setLoading(true);
      setError(null);

      // 1. Fetch Assets
      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (assetsError) throw assetsError;
      const allAssets = (assetsData as Asset[]) || [];
      setAssets(allAssets);
      setCachedData("admin_assets", allAssets);

      // 2. Fetch Pages to show which pages are attached
      const { data: pagesData } = await supabase
        .from("pages")
        .select("id, name, slug, pdf_asset_id");

      if (pagesData) {
        setPages(pagesData as Page[]);
        setCachedData("admin_pages_brief", pagesData as Page[]);
      }
    } catch (err: any) {
      console.error("Error fetching assets:", err);
      setError(err.message || "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsAndPages();
  }, []);

  // Handle PDF Upload to Supabase Storage 'pdfs' bucket and insert into 'assets' table
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !canEdit) return;

    if (uploadFile.type !== "application/pdf") {
      alert("Only PDF documents are allowed.");
      return;
    }

    if (uploadFile.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Generate unique storage path
      const fileExt = "pdf";
      const cleanFileName = uploadFile.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      const storagePath = `guides/${Date.now()}-${cleanFileName}.${fileExt}`;

      // 2. Upload to Supabase Storage bucket 'pdfs'
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(storagePath, uploadFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Insert metadata into assets table
      const assetTitle = customAssetName.trim() || uploadFile.name.replace(/\.pdf$/i, "");
      const { data: insertedAsset, error: dbError } = await supabase
        .from("assets")
        .insert({
          name: assetTitle,
          storage_path: storagePath,
        })
        .select("*")
        .single();

      if (dbError) throw dbError;

      setAssets((prev) => [insertedAsset, ...prev]);
      setIsUploadOpen(false);
      setUploadFile(null);
      setCustomAssetName("");
    } catch (err: any) {
      alert("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  // Generate first-party download link for PDF document
  const handleGenerateSignedUrl = (asset: Asset) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const downloadUrl = `${origin}/api/v1/download?asset_id=${asset.id}`;
    setSignedUrlData({ url: downloadUrl, name: asset.name });
  };

  // Attach Asset to a Page
  const handleAttachToPage = async () => {
    if (!attachAsset || !selectedPageToAttach || !canEdit) return;
    setIsAttaching(true);

    try {
      const { error } = await supabase
        .from("pages")
        .update({
          pdf_asset_id: attachAsset.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPageToAttach);

      if (error) throw error;

      // Update local state
      setPages((prev) =>
        prev.map((p) =>
          p.id === selectedPageToAttach ? { ...p, pdf_asset_id: attachAsset.id } : p
        )
      );

      setAttachAsset(null);
      setSelectedPageToAttach("");
      alert("Asset attached to page successfully!");
    } catch (err: any) {
      alert("Failed to attach asset: " + err.message);
    } finally {
      setIsAttaching(false);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async () => {
    if (!deleteConfirmAsset || !canEdit) return;
    setIsDeleting(true);

    try {
      // 1. Delete from storage bucket
      await supabase.storage.from("pdfs").remove([deleteConfirmAsset.storage_path]);

      // 2. Delete from assets table
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", deleteConfirmAsset.id);

      if (error) throw error;

      setAssets((prev) => prev.filter((a) => a.id !== deleteConfirmAsset.id));
      setDeleteConfirmAsset(null);
    } catch (err: any) {
      alert("Error deleting asset: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header & Upload Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderDown className="w-5 h-5 text-blue-600" />
            <span>Document & Resource Library</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage downloadable guides, roadmaps, and checklist documents attached to your pages.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 touch-target flex-shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>
        )}
      </div>

      {/* 2. Content: Stacked Cards on Mobile (360px) & Data Table on Desktop (768px+) */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">Loading assets...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading assets</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No assets uploaded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Upload PDF checklists, visa guides, or lead magnets to attach them to your landing pages.
          </p>
          {canEdit && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 touch-target"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload first PDF</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (< 768px): Stacked Cards with 44px Tap Targets */}
          <div className="md:hidden space-y-3">
            {assets.map((asset) => {
              const attachedPages = pages.filter((p) => p.pdf_asset_id === asset.id);

              return (
                <div
                  key={asset.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {asset.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        {asset.storage_path}
                      </p>
                    </div>
                  </div>

                  {/* Attached Pages Pill */}
                  <div className="text-xs pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Attached to:
                    </span>
                    {attachedPages.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {attachedPages.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        Not attached to any page
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleGenerateSignedUrl(asset)}
                      className="touch-target px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Download Link</span>
                    </button>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setAttachAsset(asset);
                            setSelectedPageToAttach(pages[0]?.id || "");
                          }}
                          className="touch-target p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Attach to Page"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmAsset(asset)}
                          className="touch-target p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="Delete Asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 768px): Full Data Table */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Document Details</th>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Attached Pages</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => {
                    const attachedPages = pages.filter((p) => p.pdf_asset_id === asset.id);

                    return (
                      <tr
                        key={asset.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {asset.name}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                                PDF Document
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* File Name */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {asset.storage_path.replace(/^guides\//, '')}
                        </td>

                        {/* Attached Pages */}
                        <td className="py-3.5 px-4">
                          {attachedPages.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {attachedPages.map((p) => (
                                <span
                                  key={p.id}
                                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium"
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              Unattached
                            </span>
                          )}
                        </td>

                        {/* Uploaded Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(asset.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleGenerateSignedUrl(asset)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Generate temporary signed download link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Signed Link</span>
                            </button>

                            {canEdit && (
                              <>
                                <button
                                  onClick={() => {
                                    setAttachAsset(asset);
                                    setSelectedPageToAttach(pages[0]?.id || "");
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Attach to Page"
                                >
                                  <Paperclip className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmAsset(asset)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete Asset"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 3. Upload PDF Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload PDF Document"
        description="Select a PDF document to attach to your landing pages (max 20MB)."
        maxWidth="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Asset Title
            </label>
            <input
              type="text"
              placeholder="e.g. Germany Opportunity Card 2026 Checklist"
              value={customAssetName}
              onChange={(e) => setCustomAssetName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              PDF Document <span className="text-rose-500">*</span>
            </label>
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                required
                accept="application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Accepted format: <code>.pdf</code> only. Max size: 20MB.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              disabled={isUploading}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl touch-target"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !uploadFile}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 touch-target"
            >
              {isUploading && <span className="animate-spin">⏳</span>}
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Attach to Page Modal */}
      {attachAsset && (
        <Modal
          isOpen={true}
          onClose={() => setAttachAsset(null)}
          title="Attach PDF to a Page"
          description={`Connect "${attachAsset.name}" as the downloadable lead magnet for a page.`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Page
              </label>
              <select
                value={selectedPageToAttach}
                onChange={(e) => setSelectedPageToAttach(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (/{p.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAttachAsset(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAttachToPage}
                disabled={isAttaching || !selectedPageToAttach}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2"
              >
                {isAttaching && <span className="animate-spin">⏳</span>}
                <Paperclip className="w-4 h-4" />
                <span>Attach Asset</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Signed Link Modal */}
      {signedUrlData && (
        <Modal
          isOpen={true}
          onClose={() => setSignedUrlData(null)}
          title="Direct Download Link"
          description="First-party streaming link routed through your domain to ensure immediate, adblock-safe downloads."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Document
              </span>
              <p className="font-bold text-sm text-slate-900">{signedUrlData.name}</p>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Direct Download URL
              </span>
              <textarea
                readOnly
                rows={3}
                value={signedUrlData.url}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono select-all"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(signedUrlData.url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 touch-target"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied!" : "Copy URL"}</span>
              </button>

              <a
                href={signedUrlData.url}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 touch-target"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open / Download</span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Confirm Delete Modal */}
      {deleteConfirmAsset && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmAsset(null)}
          title="Delete PDF Asset?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong>"{deleteConfirmAsset.name}"</strong>? It will be removed from any connected landing pages.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmAsset(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAsset}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
