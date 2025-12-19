import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Check,
	X,
	Clock,
	FileText,
	Video,
	Image,
	Download,
	Eye,
	EyeOff,
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize2,
	RefreshCw,
	TrendingUp,
	Upload,
	CheckCircle,
	XCircle,
	AlertCircle,
	AlertTriangle,
	Tag,
} from 'lucide-react';
import type { ContentUpload } from '@/types/admin';
import { adminApi } from '@/services/api';
import TagDragDrop from './TagDragDrop';
import { brandColors } from '@/theme/brand';

interface UploadQueueProps {
	uploads: ContentUpload[];
	onApprove: (
		uploadId: number,
		action: 'approve' | 'reject',
		reason?: string
	) => Promise<boolean>;
	loading?: boolean;
	error?: string | null;
	onRefresh?: () => void;
}

const UploadQueue: React.FC<UploadQueueProps> = ({
	uploads,
	onApprove,
	loading,
	error,
	onRefresh,
}) => {
	const { t } = useTranslation();
	const [rejectingId, setRejectingId] = useState<number | null>(null);
	const [rejectionReason, setRejectionReason] = useState('');
	const [previewId, setPreviewId] = useState<number | null>(null);
	const [videoStates, setVideoStates] = useState<
		Record<number, { playing: boolean; muted: boolean }>
	>({});
	const [retryingId, setRetryingId] = useState<number | null>(null); // FR5: Retry state
	const [previewData, setPreviewData] = useState<Record<number, any>>({}); // FR5: Preview data
	const [loadingPreview, setLoadingPreview] = useState<number | null>(null); // FR5: Preview loading
	const [taggingUploadId, setTaggingUploadId] = useState<number | null>(null); // FR5: Tag drag-drop
	const [availableChapters, setAvailableChapters] = useState<Array<{ id: string; name: string }>>([]); // FR5: Chapters for assignment

	const getFileIcon = (fileType: string) => {
		switch (fileType) {
			case 'video':
				return <Video className="h-5 w-5 text-red-500" />;
			case 'image':
				return <Image className="h-5 w-5 text-green-500" />;
			default:
				return <FileText className="h-5 w-5 text-blue-500" />;
		}
	};

	const getTimeAgo = (date: string | Date) => {
		const now = new Date();
		const uploadDate = typeof date === 'string' ? new Date(date) : date;
		const diffInHours = Math.floor(
			(now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60)
		);

		if (diffInHours < 1) return 'Just now';
		if (diffInHours < 24) return `${diffInHours}h ago`;
		if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
		return uploadDate.toLocaleDateString();
	};

	const handleApprove = async (uploadId: number) => {
		const success = await onApprove(uploadId, 'approve');
		if (success) {
			// Success handled in parent
		}
	};

	const handleReject = async (uploadId: number) => {
		if (!rejectionReason.trim()) return;

		const success = await onApprove(uploadId, 'reject', rejectionReason);
		if (success) {
			setRejectingId(null);
			setRejectionReason('');
		}
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	// FR5: Get upload preview (REQUIREMENT: Preview functionality)
	const togglePreview = async (uploadId: number) => {
		if (previewId === uploadId) {
			setPreviewId(null);
			return;
		}

		setPreviewId(uploadId);
		setLoadingPreview(uploadId);

		try {
			const response = await adminApi.getUploadPreview(uploadId);
			if (response.success) {
				setPreviewData(prev => ({
					...prev,
					[uploadId]: response.data.preview
				}));
			}
		} catch (error) {
			// console.error('Failed to load preview:', error);
		} finally {
			setLoadingPreview(null);
		}
	};

	// FR5: Retry failed upload (REQUIREMENT: Handles failed uploads with retry)
	const handleRetry = async (uploadId: number) => {
		setRetryingId(uploadId);
		try {
			const response = await adminApi.retryUpload(uploadId);
			if (response.success) {
				// Refresh the queue - parent should handle this
				window.location.reload(); // Temporary - should use refetch callback
			}
		} catch (error: any) {
			// console.error('Failed to retry upload:', error);
			// alert(error.response?.data?.message || 'Failed to retry upload');
		} finally {
			setRetryingId(null);
		}
	};

	const toggleVideoPlay = (uploadId: number) => {
		setVideoStates((prev) => ({
			...prev,
			[uploadId]: {
				...prev[uploadId],
				playing: !prev[uploadId]?.playing,
			},
		}));
	};

	const toggleVideoMute = (uploadId: number) => {
		setVideoStates((prev) => ({
			...prev,
			[uploadId]: {
				...prev[uploadId],
				muted: !prev[uploadId]?.muted,
			},
		}));
	};

	const renderPreview = (upload: ContentUpload) => {
		if (previewId !== upload.id) return null;

		// In a real implementation, we would generate a preview URL
		// For now, we'll show a placeholder based on file type
		switch (upload.file_type) {
			case 'video':
				return (
					<div className="mt-4 bg-gray-900 rounded-lg overflow-hidden">
						<div className="relative aspect-video flex items-center justify-center">
							<div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
								<div className="text-center">
									<Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
									<p className="text-gray-400">Video Preview</p>
									<p className="text-gray-500 text-sm mt-1">
										File: {upload.file_name}
									</p>
								</div>
							</div>
							<div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<button
										onClick={() => toggleVideoPlay(upload.id)}
										className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
									>
										{videoStates[upload.id]?.playing ? (
											<Pause className="h-5 w-5 text-white" />
										) : (
											<Play className="h-5 w-5 text-white" />
										)}
									</button>
									<button
										onClick={() => toggleVideoMute(upload.id)}
										className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
									>
										{videoStates[upload.id]?.muted ? (
											<VolumeX className="h-5 w-5 text-white" />
										) : (
											<Volume2 className="h-5 w-5 text-white" />
										)}
									</button>
								</div>
								<button className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
									<Maximize2 className="h-5 w-5 text-white" />
								</button>
							</div>
						</div>
					</div>
				);
			case 'image':
				return (
					<div className="mt-4 bg-gray-100 rounded-lg overflow-hidden">
						<div className="aspect-video flex items-center justify-center">
							<div className="text-center">
								<Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600">Image Preview</p>
								<p className="text-gray-500 text-sm mt-1">
									File: {upload.file_name}
								</p>
							</div>
						</div>
					</div>
				);
			default:
				return (
					<div className="mt-4 bg-gray-50 rounded-lg p-6">
						<div className="flex items-start">
							<FileText className="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
							<div>
								<h4 className="font-medium text-gray-900">Document Preview</h4>
								<p className="text-gray-600 text-sm mt-1">
									File: {upload.file_name}
								</p>
								<p className="text-gray-500 text-xs mt-2">
									This file type cannot be previewed directly. Click "Download"
									to view the full content.
								</p>
							</div>
						</div>
					</div>
				);
		}
	};

	const exportCsv = () => {
		if (!uploads || uploads.length === 0) return;
		const header = ['ID', 'Title', 'Description', 'Type', 'Status', 'Size', 'Chapter', 'Uploaded At'];
		const rows = uploads.map((u) => [
			u.id,
			u.title || '',
			u.description || '',
			u.media_type || (u as any).type || '',
			u.status || '',
			(u as any).size || '',
			(u as any).chapter || '',
			u.created_at || '',
		]);
		const csv = [header, ...rows]
			.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
			.join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'upload-queue.csv';
		link.click();
		URL.revokeObjectURL(url);
	};

	if (loading && uploads.length === 0) {
		return (
			<div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
				<div className="flex items-center justify-center min-h-96">
					<div className="text-center">
						<RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">{t('upload_queue.loading', 'Loading upload queue...')}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm">{error}</span>
					</div>
					{onRefresh && (
						<button
							onClick={onRefresh}
							className="px-3 py-1.5 text-sm bg-white border border-red-200 rounded-md text-red-700 hover:bg-red-100"
						>
							{t('common.retry', 'Retry')}
						</button>
					)}
				</div>
			)}
			{/* Header Section - Compact */}
			<div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 text-stone-800 shadow-sm">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
					<div className="flex-1">
						<div className="flex items-center space-x-2 mb-1">
							<h1 className="text-lg sm:text-xl font-bold text-stone-900">{t('upload_queue.title', 'Upload Queue')}</h1>
							<div className="hidden sm:flex items-center space-x-1 text-stone-500">
								<Clock className="h-3 w-3" />
								<span className="text-xs">{t('upload_queue.updated', 'Updated {{time}}', { time: getTimeAgo(new Date()) })}</span>
							</div>
						</div>
						<p className="text-stone-600 text-xs sm:text-sm">
							{t('upload_queue.subtitle', 'Monitor and manage file upload progress')}
						</p>
						<p className="text-stone-500 text-xs mt-1">
							{t('upload_queue.counts', '{{total}} total uploads • {{pending}} pending review', {
								total: uploads.length,
								pending: uploads.filter((u) => u.status === 'pending').length,
							})}
						</p>
					</div>
					<div className="mt-3 lg:mt-0 lg:ml-4">
						<div className="flex flex-col sm:flex-row gap-1.5">
							<button
								disabled={loading}
								onClick={onRefresh}
								className="inline-flex items-center px-4 py-2 bg-indigo-900 text-white text-xs font-semibold rounded-lg border border-indigo-800 hover:bg-indigo-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
							>
								<RefreshCw
									className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`}
								/>
								{t('common.refresh', 'Refresh')}
							</button>
							<button
								onClick={exportCsv}
								className="inline-flex items-center px-3 py-1.5 bg-white text-stone-800 text-xs font-medium rounded-lg border hover:bg-slate-50 transition-colors duration-200"
								style={{ borderColor: '#e2e8f0' }}
							>
								<Download className="h-3 w-3 mr-1.5 text-brand-primary" />
								{t('common.export_csv', 'Export CSV')}
							</button>
							<button className="inline-flex items-center px-3 py-1.5 bg-white text-stone-800 text-xs font-medium rounded-lg border hover:bg-slate-50 transition-colors duration-200" style={{ borderColor: '#e2e8f0' }}>
								<CheckCircle className="h-3 w-3 mr-1.5 text-brand-primary" />
								{t('upload_queue.clear_completed', 'Clear Completed')}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Grid - Compact */}
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
				{[
					{
						name: 'Pending',
						value: uploads.filter((u) => u.status === 'pending').length.toString(),
						icon: Clock,
						change: '+2',
						changeType: 'positive',
						color: 'from-blue-500 to-blue-600',
						bgColor: 'from-blue-50 to-blue-100',
					},
					{
						name: 'Approved',
						value: uploads
							.filter((u) => u.status === 'approved')
							.length.toString(),
						icon: CheckCircle,
						change: '+8',
						changeType: 'positive',
						color: 'from-green-500 to-green-600',
						bgColor: 'from-green-50 to-green-100',
					},
					{
						name: 'Rejected',
						value: uploads
							.filter((u) => u.status === 'rejected')
							.length.toString(),
						icon: XCircle,
						change: '-1',
						changeType: 'negative',
						color: 'from-red-500 to-red-600',
						bgColor: 'from-red-50 to-red-100',
					},
					{
						name: 'Processing',
						value: uploads
							.filter((u) => u.status === 'processing')
							.length.toString(),
						icon: AlertCircle,
						change: '0',
						changeType: 'neutral',
						color: 'from-amber-500 to-amber-600',
						bgColor: 'from-amber-50 to-amber-100',
					},
					// FR5: Failed uploads stat
					{
						name: 'Failed',
						value: uploads
							.filter((u) => u.status === 'failed')
							.length.toString(),
						icon: XCircle,
						change: '0',
						changeType: 'negative',
						color: 'from-red-500 to-red-600',
						bgColor: 'from-red-50 to-red-100',
					},
				].map((stat, index) => (
					<div
						key={index}
						className={`bg-white rounded-lg p-2.5 sm:p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200`}
					>
						<div className="flex items-center justify-between mb-1.5">
							<div className="p-1.5 rounded-md bg-brand-primary text-white shadow-sm">
								<stat.icon className="h-3 w-3" />
							</div>
							<div className="text-right">
								<div className="flex items-center space-x-1">
									<TrendingUp
										className={`h-2.5 w-2.5 ${stat.changeType === 'positive'
											? 'text-brand-primary'
											: stat.changeType === 'negative'
												? 'text-brand-accent'
												: 'text-slate-600'
											}`}
									/>
									<span
										className={`text-xs font-medium ${stat.changeType === 'positive'
											? 'text-brand-primary'
											: stat.changeType === 'negative'
												? 'text-brand-accent'
												: 'text-slate-700'
											}`}
									>
										{stat.change}
									</span>
								</div>
							</div>
						</div>
						<div>
							<p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">
								{stat.value}
							</p>
							<p className="text-xs text-gray-600 font-medium">{stat.name}</p>
						</div>
					</div>
				))}
			</div>

			{/* Upload Queue Display - Card Grid */}
			{uploads.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
					{uploads.map((upload) => (
						<div
							key={upload.id}
							className="relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
						>
							{/* Upload Header with Status Color */}
							<div
								className={`p-4 text-white`}
								style={{ backgroundColor: upload.status === 'rejected' ? brandColors.accentHex : brandColors.primaryHex }}
							>
								<div className="flex items-start justify-between">
									<div className="flex items-center flex-1">
										<div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center text-white mr-3">
											{getFileIcon(upload.file_type)}
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="text-base font-bold truncate">
												{upload.title}
											</h3>
											<p className="text-white/80 text-xs truncate">
												By {upload.uploader_first_name}{' '}
												{upload.uploader_last_name}
											</p>
										</div>
									</div>
									<span
										className={`px-2 py-1 rounded-md text-xs font-medium bg-white/20`}
									>
										{upload.status}
									</span>
								</div>
							</div>

							{/* Upload Details */}
							<div className="p-4">
								<p className="text-gray-600 text-sm mb-3">
									{upload.description || 'No description provided'}
								</p>

								{/* FR5: Error message display (REQUIREMENT: Error notification) */}
								{upload.status === 'failed' && upload.error_message && (
									<div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
										<div className="flex items-start">
											<AlertTriangle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
											<div className="flex-1">
												<p className="text-xs font-medium text-red-800">Upload Failed</p>
												<p className="text-xs text-red-600 mt-1">{upload.error_message}</p>
											</div>
										</div>
									</div>
								)}

								{/* FR5: Upload time warning (REQUIREMENT: <5 min to upload) */}
								{upload.upload_time_minutes && upload.upload_time_minutes > 5 && (
									<div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
										<div className="flex items-center">
											<AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
											<p className="text-xs text-yellow-800">
												Upload took <span className="font-semibold">{upload.upload_time_minutes.toFixed(2)} minutes</span> (exceeds 5 min requirement)
											</p>
										</div>
									</div>
								)}

								<div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
									<div className="flex items-center">
										<Clock className="h-3 w-3 mr-1" />
										<span>{getTimeAgo(upload.created_at)}</span>
									</div>
									<div className="flex items-center">
										<FileText className="h-3 w-3 mr-1" />
										<span>
											{formatFileSize(parseInt(upload.file_size || '0'))}
										</span>
									</div>
									{/* FR5: Upload time display */}
									{upload.upload_time_minutes && (
										<div className="flex items-center">
											<Clock className="h-3 w-3 mr-1" />
											<span>{upload.upload_time_minutes.toFixed(2)} min</span>
										</div>
									)}
									{/* FR5: Retry count display */}
									{upload.retry_count && upload.retry_count > 0 && (
										<div className="flex items-center">
											<RefreshCw className="h-3 w-3 mr-1" />
											<span>Retries: {upload.retry_count}</span>
										</div>
									)}
									<div className="col-span-2">
										<span className="text-gray-500">Chapter: </span>
										<span className="font-medium">{upload.chapter_id}</span>
									</div>
								</div>

								{/* FR5: Tags display and tag management */}
								<div className="mb-3">
									{upload.tags.length > 0 && (
										<div className="flex flex-wrap gap-1 mb-2">
											{upload.tags.map((tag) => (
												<span
													key={tag}
													className="inline-block bg-brand-primary/10 text-brand-primary text-xs px-2 py-1 rounded-md"
												>
													{tag}
												</span>
											))}
										</div>
									)}
									<button
										onClick={() => {
											setTaggingUploadId(taggingUploadId === upload.id ? null : upload.id);
										}}
										className="inline-flex items-center px-2 py-1 text-xs font-medium text-brand-primary bg-white border border-brand-primary/40 rounded hover:bg-brand-primary/5 transition-colors"
									>
										<Tag className="h-3 w-3 mr-1" />
										{taggingUploadId === upload.id ? 'Hide Tags' : 'Manage Tags'}
									</button>
								</div>

								{/* FR5: Tag Drag-Drop Interface (REQUIREMENT: Drag-drop, multi-tagging, chapter assign) */}
								{taggingUploadId === upload.id && (
									<div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
										<TagDragDrop
											contentType="upload"
											contentId={upload.id}
											currentTags={upload.tags as any} // Tags are strings, component will handle conversion
											currentChapterId={upload.chapter_id}
											availableChapters={availableChapters}
											onTagsUpdated={(_tags) => {
												// Refresh upload list - parent should handle this
												// console.log('Tags updated:', tags);
											}}
											onChapterAssigned={(_chapterId) => {
												// console.log('Chapter assigned:', chapterId);
												// Update chapter assignment - would need API call
											}}
										/>
									</div>
								)}

								{/* FR5: Preview Section - Enhanced with API preview */}
								{previewId === upload.id && (
									<div className="mt-4">
										{loadingPreview === upload.id ? (
											<div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
												<RefreshCw className="h-5 w-5 animate-spin text-blue-600 mr-2" />
												<span className="text-sm text-gray-600">Loading preview...</span>
											</div>
										) : previewData[upload.id] ? (
											<div className="bg-gray-50 rounded-lg p-4">
												{previewData[upload.id].thumbnail_url && (
													<img
														src={previewData[upload.id].thumbnail_url}
														alt="Preview"
														className="w-full rounded-lg mb-2"
													/>
												)}
												{previewData[upload.id].preview_url && (
													<a
														href={previewData[upload.id].preview_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-blue-600 hover:underline"
													>
														View Full Preview
													</a>
												)}
											</div>
										) : (
											renderPreview(upload)
										)}
									</div>
								)}

								{/* Action Buttons */}
								<div className="flex flex-col space-y-2 pt-3 border-t border-gray-200">
									{/* FR5: Retry button for failed uploads (REQUIREMENT: Handles failed uploads with retry) */}
									{upload.status === 'failed' && (
										<button
											onClick={() => handleRetry(upload.id)}
											disabled={retryingId === upload.id}
											className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
											style={{ backgroundColor: brandColors.primaryHex }}
										>
											{retryingId === upload.id ? (
												<>
													<RefreshCw className="mr-1 h-3 w-3 animate-spin" />
													Retrying...
												</>
											) : (
												<>
													<RefreshCw className="mr-1 h-3 w-3" />
													Retry Upload
												</>
											)}
										</button>
									)}

									{upload.status === 'pending' && (
										<>
											{rejectingId === upload.id ? (
												<div className="space-y-2">
													<input
														type="text"
														placeholder="Enter rejection reason..."
														value={rejectionReason}
														onChange={(e) => setRejectionReason(e.target.value)}
														className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
													/>
													<div className="flex space-x-2">
														<button
															onClick={() => handleReject(upload.id)}
															disabled={!rejectionReason.trim()}
															className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
															style={{ backgroundColor: brandColors.accentHex }}
														>
															<X className="mr-1 h-3 w-3" />
															Confirm Reject
														</button>
														<button
															onClick={() => setRejectingId(null)}
															className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-lg text-stone-700 bg-white hover:bg-slate-50 transition-colors"
														>
															Cancel
														</button>
													</div>
												</div>
											) : (
												<div className="flex space-x-2">
													<button
														onClick={() => handleApprove(upload.id)}
														className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white transition-colors"
														style={{ backgroundColor: brandColors.primaryHex }}
													>
														<Check className="mr-1 h-3 w-3" />
														Approve
													</button>

													<button
														onClick={() => setRejectingId(upload.id)}
														className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white transition-colors"
														style={{ backgroundColor: brandColors.accentHex }}
													>
														<X className="mr-1 h-3 w-3" />
														Reject
													</button>
												</div>
											)}
										</>
									)}

									<div className="flex space-x-2">
										<button
											onClick={() => togglePreview(upload.id)}
											disabled={loadingPreview === upload.id}
											className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border text-xs font-medium rounded-lg bg-white disabled:opacity-50 transition-colors"
											style={{ borderColor: `${brandColors.primaryHex}66`, color: brandColors.primaryHex }}
										>
											{loadingPreview === upload.id ? (
												<>
													<RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Loading...
												</>
											) : previewId === upload.id ? (
												<>
													<EyeOff className="mr-1 h-3 w-3" /> Hide Preview
												</>
											) : (
												<>
													<Eye className="mr-1 h-3 w-3" /> Preview
												</>
											)}
										</button>

										<button className="inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-lg text-stone-700 bg-white hover:bg-slate-50 transition-colors" style={{ borderColor: '#e2e8f0' }}>
											<Download className="h-3 w-3" />
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 text-center shadow-sm">
					<Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<h3 className="text-lg font-bold text-gray-900 mb-2">
						No uploads in queue
					</h3>
					<p className="text-gray-600 text-sm mb-4 max-w-lg mx-auto">
						Upload queue is empty. New uploads will appear here automatically.
					</p>
				</div>
			)}
		</div>
	);
};

export default UploadQueue;
