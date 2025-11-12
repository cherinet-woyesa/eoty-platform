import React, { useState } from 'react';
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
} from 'lucide-react';
import type { ContentUpload } from '@/types/admin';

interface UploadQueueProps {
	uploads: ContentUpload[];
	onApprove: (
		uploadId: number,
		action: 'approve' | 'reject',
		reason?: string
	) => Promise<boolean>;
	loading?: boolean;
}

const UploadQueue: React.FC<UploadQueueProps> = ({
	uploads,
	onApprove,
	loading,
}) => {
	const [rejectingId, setRejectingId] = useState<number | null>(null);
	const [rejectionReason, setRejectionReason] = useState('');
	const [previewId, setPreviewId] = useState<number | null>(null);
	const [videoStates, setVideoStates] = useState<
		Record<number, { playing: boolean; muted: boolean }>
	>({});

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

	const togglePreview = (uploadId: number) => {
		setPreviewId(previewId === uploadId ? null : uploadId);
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

	if (loading && uploads.length === 0) {
		return (
			<div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
				<div className="flex items-center justify-center min-h-96">
					<div className="text-center">
						<RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">Loading upload queue...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
			{/* Header Section - Compact */}
			<div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-3 sm:p-4 text-white shadow-lg">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
					<div className="flex-1">
						<div className="flex items-center space-x-2 mb-1">
							<h1 className="text-lg sm:text-xl font-bold">Upload Queue</h1>
							<div className="hidden sm:flex items-center space-x-1 text-blue-100">
								<Clock className="h-3 w-3" />
								<span className="text-xs">Updated {getTimeAgo(new Date())}</span>
							</div>
						</div>
						<p className="text-blue-100 text-xs sm:text-sm">
							Monitor and manage file upload progress
						</p>
						<p className="text-blue-200 text-xs mt-1">
							{uploads.length} total uploads •{' '}
							{uploads.filter((u) => u.status === 'pending').length} pending
							review
						</p>
					</div>
					<div className="mt-3 lg:mt-0 lg:ml-4">
						<div className="flex flex-col sm:flex-row gap-1.5">
							<button
								disabled={loading}
								className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm disabled:opacity-50"
							>
								<RefreshCw
									className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`}
								/>
								Refresh
							</button>
							<button className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm">
								<CheckCircle className="h-3 w-3 mr-1.5" />
								Clear Completed
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Grid - Compact */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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
				].map((stat, index) => (
					<div
						key={index}
						className={`bg-gradient-to-br ${stat.bgColor} rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}
					>
						<div className="flex items-center justify-between mb-1.5">
							<div
								className={`p-1.5 rounded-md bg-gradient-to-r ${stat.color} shadow-sm`}
							>
								<stat.icon className="h-3 w-3 text-white" />
							</div>
							<div className="text-right">
								<div className="flex items-center space-x-1">
									<TrendingUp
										className={`h-2.5 w-2.5 ${
											stat.changeType === 'positive'
												? 'text-green-600'
												: stat.changeType === 'negative'
												? 'text-red-600'
												: 'text-gray-600'
										}`}
									/>
									<span
										className={`text-xs font-medium ${
											stat.changeType === 'positive'
												? 'text-green-700'
												: stat.changeType === 'negative'
												? 'text-red-700'
												: 'text-gray-700'
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
								className={`bg-gradient-to-r ${
									upload.status === 'approved'
										? 'from-green-500 to-green-600'
										: upload.status === 'rejected'
										? 'from-red-500 to-red-600'
										: upload.status === 'processing'
										? 'from-blue-500 to-blue-600'
										: 'from-amber-500 to-amber-600'
								} p-4 text-white`}
							>
								<div className="flex items-start justify-between">
									<div className="flex items-center flex-1">
										<div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white mr-3">
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
										className={`px-2 py-1 rounded-md text-xs font-medium bg-white/20 backdrop-blur-sm`}
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
									<div className="col-span-2">
										<span className="text-gray-500">Chapter: </span>
										<span className="font-medium">{upload.chapter_id}</span>
									</div>
								</div>

								{upload.tags.length > 0 && (
									<div className="flex flex-wrap gap-1 mb-3">
										{upload.tags.map((tag) => (
											<span
												key={tag}
												className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md"
											>
												{tag}
											</span>
										))}
									</div>
								)}

								{/* Preview Section */}
								{renderPreview(upload)}

								{/* Action Buttons */}
								<div className="flex flex-col space-y-2 pt-3 border-t border-gray-200">
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
															className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
														>
															<X className="mr-1 h-3 w-3" />
															Confirm Reject
														</button>
														<button
															onClick={() => setRejectingId(null)}
															className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
														>
															Cancel
														</button>
													</div>
												</div>
											) : (
												<div className="flex space-x-2">
													<button
														onClick={() => handleApprove(upload.id)}
														className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
													>
														<Check className="mr-1 h-3 w-3" />
														Approve
													</button>

													<button
														onClick={() => setRejectingId(upload.id)}
														className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
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
											className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-lg text-blue-700 bg-white hover:bg-blue-50 transition-colors"
										>
											{previewId === upload.id ? (
												<>
													<EyeOff className="mr-1 h-3 w-3" /> Hide Preview
												</>
											) : (
												<>
													<Eye className="mr-1 h-3 w-3" /> Preview
												</>
											)}
										</button>

										<button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
											<Download className="h-3 w-3" />
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
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
