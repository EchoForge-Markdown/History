#include <iostream>
#include <string>
#include <iomanip>  // 用于格式化输出

// 单位转换函数
double inches_to_cm(double inches) {
    return inches * 2.54;
}

double cm_to_inches(double cm) {
    return cm / 2.54;
}

int main() {
    std::cout << "欢迎使用全球儿童身高预测工具 - 基础版 (C++)\n";
    std::cout << "请输入以下信息（支持厘米/英寸单位）。\n\n";

    // 输入性别
    std::string gender_raw;
    std::cout << "孩子性别 (输入 '男' 或 '女'): ";
    std::cin >> gender_raw;

    auto normalize_gender = [](const std::string &s) -> std::string {
        if (s.empty()) return "";
        // check for Chinese characters first
        if (s.find("男") != std::string::npos) return "男";
        if (s.find("女") != std::string::npos) return "女";
        // check english initials or words
        std::string t;
        for (char c : s) t += std::tolower((unsigned char)c);
        if (t.size() > 0 && (t[0] == 'm')) return "男";
        if (t.size() > 0 && (t[0] == 'f')) return "女";
        if (t.find("male") != std::string::npos) return "男";
        if (t.find("female") != std::string::npos) return "女";
        return "";
    };
    std::string gender = normalize_gender(gender_raw);

    // 输入年龄
    double age;
    std::cout << "孩子年龄（年）: ";
    std::cin >> age;

    // 输入孩子身高
    auto detect_unit = [](const std::string &s) -> std::string {
        std::string t;
        for (char c : s) t += std::tolower((unsigned char)c);
        if (t.find("cm") != std::string::npos) return "cm";
        if (t.find("厘米") != std::string::npos) return "cm";
        if (t.find("in") != std::string::npos) return "in";
        if (t.find("英寸") != std::string::npos) return "in";
        return "cm"; // default to cm
    };

    std::string child_unit_raw;
    double child_height;
    std::cout << "孩子当前身高单位 (厘米 或 英寸): ";
    std::cin >> child_unit_raw;
    std::cout << "孩子当前身高: ";
    std::cin >> child_height;
    std::string child_unit = detect_unit(child_unit_raw);
    if (child_unit == "in") {
        child_height = inches_to_cm(child_height);
    }

    // 输入父亲身高
    std::string father_unit_raw;
    double father_height;
    std::cout << "父亲身高单位 (厘米 或 英寸): ";
    std::cin >> father_unit_raw;
    std::cout << "父亲身高: ";
    std::cin >> father_height;
    std::string father_unit = detect_unit(father_unit_raw);
    if (father_unit == "in") {
        father_height = inches_to_cm(father_height);
    }

    // 输入母亲身高
    std::string mother_unit_raw;
    double mother_height;
    std::cout << "母亲身高单位 (厘米 或 英寸): ";
    std::cin >> mother_unit_raw;
    std::cout << "母亲身高: ";
    std::cin >> mother_height;
    std::string mother_unit = detect_unit(mother_unit_raw);
    if (mother_unit == "in") {
        mother_height = inches_to_cm(mother_height);
    }

    // 计算预测身高（厘米）
    double predicted_height;
    if (gender == "男") {
        predicted_height = (father_height + mother_height + 13) / 2.0;
    } else if (gender == "女") {
        predicted_height = (father_height + mother_height - 13) / 2.0;
    } else {
        std::cout << "无效性别输入！\n";
        return 1;
    }

    // 计算范围
    double low = predicted_height - 8.0;
    double high = predicted_height + 8.0;

    // 输出结果
    std::cout << "\n预计成人身高（厘米）：" << std::fixed << std::setprecision(1) << low << " - " << high << "\n";
    std::cout << "注意：这基于遗传公式，受营养、健康等影响。仅供参考，请咨询专业医生。\n\n";

    // 简单文本比较
    std::cout << "身高比较（厘米）:\n";
    std::cout << "母亲: " << mother_height << "\n";
    std::cout << "父亲: " << father_height << "\n";
    std::cout << "预测: " << predicted_height << "\n";

    return 0;
}
