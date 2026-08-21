<?php

return [
    'account-overview' => 'Tổng quan về tài khoản',
    'twofactor-messagebox' => 'Tài khoản của bạn phải kích hoạt xác thực hai yếu tố để tiếp tục.',
    'apikey' => 'Khóa API',
    'sshkey' => 'Khóa SSH',

    'update-password' => [
        'current' => 'Mật khẩu hiện tại',
        'new' => 'Mật khẩu mới',
        'requirements' => 'Mật khẩu mới của bạn phải dài ít nhất 8 ký tự và duy nhất cho trang web này.',
        'confirm' => 'Xác nhận mật khẩu mới',
        'update' => 'Cập nhật mật khẩu',
    ],

    'update-email' => [
        'isUpdated' => 'Email chính của bạn đã được cập nhật',
        'update' => 'Cập nhật email',
        'email' => 'E-mail',
        'confirm' => 'Xác nhận mật khẩu',
    ],

    'appearance' => [
        'title' => 'Giao diện',
        'lightDarkMode' => 'Chế độ sáng/tối',
        'light' => 'Sáng',
        'dark' => 'Tối',
        'language' => 'Ngôn ngữ bảng điều khiển',
        'panel-sounds' => 'Bảng âm thanh',
        'on' => 'Bật',
        'off' => 'Tắt',
        'privacy-mode' => 'Chế độ riêng tư',
    ],

    'twofactor' => [
        'title' => 'Xác thực hai yếu tố',
        'isEnabled' => 'Xác minh hai bước hiện được bật trên tài khoản của bạn.',
        'isDisabled' => 'Bạn hiện chưa bật xác minh hai bước trên tài khoản của mình. Nhấp vào nút bên dưới để bắt đầu cấu hình nó.',
        'disable' => 'Tắt hai bước',
        'enable' => 'Kích hoạt hai bước',
        
        'disable-dialog' => [
            'password' => 'Mật khẩu',
            'cancel' => 'Hủy',
            'must-enter-password' => 'Bạn phải nhập mật khẩu tài khoản của bạn để tiếp tục.',
            'disable' => 'Tắt',
        ],

        'setup-dialog' => [
            'description' => 'Quét mã QR ở trên bằng ứng dụng xác thực hai bước bạn chọn. Sau đó, nhập mã gồm 6 chữ số được tạo vào trường bên dưới.',
            'account-password' => 'Mật khẩu tài khoản',
            'qrcode-loading' => 'Đang chờ tải mã QR...',
            'enter-6digit-password' => 'Bạn phải nhập mã gồm 6 chữ số và mật khẩu của bạn để tiếp tục.',
            'enable' => 'Bật',
            'cancel' => 'Hủy',
        ],
    ],

    'apiKey' => [
        'label' => 'Mô tả',
        'description' => 'Mô tả về khóa API này.',
        'allowedIPs-label' => 'IP được phép',
        'allowedIPs-description' => 'Để trống để cho phép bất kỳ địa chỉ IP nào sử dụng khóa API này, nếu không thì cung cấp từng địa chỉ IP trên một dòng mới.',
        'createButton' => 'Tạo',

        'your-keys' => 'Khóa API của bạn',
        'store-save' => 'Khóa API bạn yêu cầu được hiển thị bên dưới. Vui lòng lưu trữ thông tin này ở một vị trí an toàn, nó sẽ không được hiển thị lại.',
        'close' => 'Đóng',

        'delete-api-key' => 'Xóa khóa API',
        'delete-key' => 'Xóa khóa',
        'all-requests-invalidated-1' => 'Tất cả các yêu cầu sử dụng',
        'all-requests-invalidated-2' => 'khóa sẽ bị vô hiệu.',
        'loading' => 'Đang tải...',
        'no-key-found' => 'Không có khóa API nào tồn tại cho tài khoản này.',
        'last-used' => 'Lần sử dụng cuối cùng',
    ],

    'sshKey' => [
        'loading' => 'Đang tải...',
        'no-key-found' => 'Không có Khóa SSH nào tồn tại cho tài khoản này.',
        'added-on' => 'Đã thêm vào',

        'createForm' => [
            'key-name' => 'Tên khóa SSH',
            'public-key' => 'Khóa công khai',
            'public-key-desc' => 'Nhập khóa SSH công khai của bạn.',
            'save' => 'Lưu',
        ],

        'deleteForm' => [
            'delete-ssh-key' => 'Xóa khóa SSH',
            'delete-key' => 'Xóa khóa',
            'will-invalidate-1' => 'Loại bỏ',
            'will-invalidate-2' => 'Khóa SSH sẽ vô hiệu hóa việc sử dụng nó trên Bảng điều khiển.',
        ],
    ],

    'profile' => [
        'update-profile' => 'Cập nhật hồ sơ',
        'first-name' => 'Tên',
        'last-name' => 'Họ',
        'username' => 'Tên người dùng',
        'updated-success' => 'Hồ sơ được cập nhật thành công.',
    ],

    'recoveryTokensDialog' => [
        'title' => 'Đã bật xác thực hai bước',
        'description' => 'Lưu trữ các mã bên dưới ở nơi nào đó an toàn. Nếu mất quyền truy cập vào điện thoại, bạn có thể sử dụng các mã dự phòng này để đăng nhập.',
        'alert' => 'Các mã này sẽ không được hiển thị lại.',
        'doneButton' => 'Xong',
    ],
];