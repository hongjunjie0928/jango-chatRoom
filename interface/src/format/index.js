export default class Formatter {
    // 格式化文件路径
    static fullFileUrl(url) {
        if (!url) return ""; // 如果没有头像路径，返回空字符串
        // 检查头像路径是否已经是完整的 URL
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        // 拼接后端基础 URL 和头像路径

        return "http://localhost:8000/file" + url;
    }

    // 格式化文件大小显示
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 格式化显示时间
    static formatTime(dateString) {
        if (!dateString) return "";

        // 尝试解析 ISO 时间字符串为 Date 对象
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.error("无效的时间格式", dateString);
            return "";
        }

        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // 刚刚 (0-59秒)
        if (diff < 60 * 1000) {
            return "刚刚";
        }

        // X分钟前 (1-59分钟)
        if (diff < 60 * 60 * 1000) {
            return Math.floor(diff / (60 * 1000)) + "分钟前";
        }

        // 今天
        if (Formatter.isSameDay(date, now)) {
            return Formatter.formatToTime(date);
        }

        // 昨天
        if (Formatter.isYesterday(date)) {
            return "昨天 " + Formatter.formatToTime(date);
        }

        // 本周内
        if (Formatter.isSameWeek(date, now)) {
            return Formatter.formatToWeekday(date) + " " + Formatter.formatToTime(date);
        }

        // 今年内
        if (date.getFullYear() === now.getFullYear()) {
            return Formatter.formatToMonthDay(date) + " " + Formatter.formatToTime(date);
        }

        // 完整日期
        return Formatter.formatToFullDate(date) + " " + Formatter.formatToTime(date);
    }

    static isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    static isYesterday(date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return Formatter.isSameDay(date, yesterday);
    }

    static isSameWeek(date1, date2) {
        const startOfWeek1 = new Date(date1);
        startOfWeek1.setDate(date1.getDate() - date1.getDay());

        const startOfWeek2 = new Date(date2);
        startOfWeek2.setDate(date2.getDate() - date2.getDay());

        return startOfWeek1.getTime() === startOfWeek2.getTime();
    }

    static formatToTime(date) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    static formatToWeekday(date) {
        const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        return weekdays[date.getDay()];
    }

    static formatToMonthDay(date) {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    static formatToFullDate(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
}