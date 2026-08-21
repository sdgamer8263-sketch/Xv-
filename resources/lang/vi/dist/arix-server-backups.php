<?php

return[
    'backups' => 'Sao lưu',
    'manage-backups' => 'Quản lý bản sao lưu',
    'create-backup' => 'Tạo bản sao lưu',
    'have-been-allocated' => '{{current}} trong số {{max}} bản sao lưu đã được tạo cho máy chủ này.',

    'name' => 'Tên',
    'size' => 'Kích cỡ',
    'creation-date' => 'Ngày tạo',
    'checksum' => 'Tổng kiểm tra',

    'failed' => 'Thất bại',
    'continue' => 'Tiếp tục',

    'download' => 'Tải xuống',
    'restore' => 'Khôi phục',
    'lock' => 'Khóa',
    'unlock' => 'Mở khóa',
    'delete' => 'Xóa',

    'limit-is-0' => 'Không thể tạo bản sao lưu cho máy chủ này vì giới hạn sao lưu được đặt thành 0.',
    'try-going-back' => 'Có vẻ như chúng tôi đã hết bản sao lưu để hiển thị cho bạn, hãy thử quay lại một trang.',
    'no-backups' => 'Có vẻ như hiện không có bản sao lưu nào được lưu trữ cho máy chủ này.',
    'no-longer-protected' => 'Bản sao lưu này sẽ không còn được bảo vệ khỏi việc xóa tự động hoặc vô tình.',
    'your-server-will-be-stopped' => 'Máy chủ của bạn sẽ bị dừng. Bạn sẽ không thể kiểm soát trạng thái nguồn, truy cập trình quản lý tệp hoặc tạo bản sao lưu bổ sung cho đến khi hoàn tất.',
    'delete-all-files' => 'Xóa tất cả các tập tin trước khi khôi phục bản sao lưu.',
    'permanent-operation' => 'Đây là thao tác vĩnh viễn. Bản sao lưu không thể được phục hồi sau khi bị xóa.',

    'create' => [
        'title' => 'Tạo bản sao lưu máy chủ',
        'backup-name' => 'Tên dự phòng',
        'backup-name-description' => 'Nếu được cung cấp, tên sẽ được sử dụng để tham chiếu bản sao lưu này.',
        'ignored-files-directories' => 'Tập tin và thư mục bị bỏ qua',
        'ignored-files-directories-description' => 'Nhập các tệp hoặc thư mục cần bỏ qua khi tạo bản sao lưu này. Để trống để sử dụng nội dung của tệp .pteroignore trong thư mục gốc của thư mục máy chủ nếu có. Hỗ trợ kết hợp ký tự đại diện của các tệp và thư mục ngoài việc phủ định quy tắc bằng cách đặt tiền tố vào đường dẫn bằng dấu chấm than.',
        'locked' => 'Đã khóa',
        'locked-description' => 'Ngăn chặn bản sao lưu này bị xóa cho đến khi được mở khóa rõ ràng.',
        'start' => 'Bắt đầu sao lưu',
    ]
];