-- Clean up any partial inserts
DELETE FROM test_cases WHERE problem_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
DELETE FROM problems WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- 1. Palindrome Number
INSERT INTO problems (id, title, difficulty, category, description, constraints, starter_code_js, starter_code_java, starter_code_cpp, starter_code_py, time_limit, memory_limit, sample_input, sample_output) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Palindrome Number', 'Easy', 'Math',
  'Given an integer x, return true if x is a palindrome, and false otherwise.',
  '-2^31 <= x <= 2^31 - 1',
  'function isPalindrome(x) {
    // Your code here
    return false;
}

const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(isPalindrome(input.x));',
  'import java.util.*;

public class Main {
    public static boolean isPalindrome(int x) {
        // Your code here
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String input = sc.nextLine();
        int x = Integer.parseInt(input.replaceAll("[^0-9-]", ""));
        System.out.println(isPalindrome(x));
    }
}',
  '#include <iostream>
#include <string>
using namespace std;

bool isPalindrome(int x) {
    // Your code here
    return false;
}

int main() {
    string input;
    getline(cin, input);
    int x = stoi(input.substr(input.find(":") + 1));
    cout << (isPalindrome(x) ? "true" : "false") << endl;
    return 0;
}',
  'import sys, json

def isPalindrome(x):
    # Your code here
    return False

data = json.load(sys.stdin)
print(str(isPalindrome(data["x"])).lower())',
  1000, 128, '{"x": 121}', 'true'
);

INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
('11111111-1111-1111-1111-111111111111', '{"x": 121}', 'true', false),
('11111111-1111-1111-1111-111111111111', '{"x": -121}', 'false', false),
('11111111-1111-1111-1111-111111111111', '{"x": 10}', 'false', true);


-- 2. Contains Duplicate
INSERT INTO problems (id, title, difficulty, category, description, constraints, starter_code_js, starter_code_java, starter_code_cpp, starter_code_py, time_limit, memory_limit, sample_input, sample_output) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Contains Duplicate', 'Easy', 'Array',
  'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
  '1 <= nums.length <= 10^5
-10^9 <= nums[i] <= 10^9',
  'function containsDuplicate(nums) {
    // Your code here
    return false;
}

const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(containsDuplicate(input.nums));',
  'import java.util.*;

public class Main {
    public static boolean containsDuplicate(int[] nums) {
        // Your code here
        return false;
    }

    public static void main(String[] args) {
        System.out.println("true"); // Simplified for demo
    }
}',
  '#include <iostream>
#include <vector>
using namespace std;

bool containsDuplicate(vector<int>& nums) {
    // Your code here
    return false;
}

int main() {
    cout << "true" << endl; // Simplified for demo
    return 0;
}',
  'import sys, json

def containsDuplicate(nums):
    # Your code here
    return False

data = json.load(sys.stdin)
print(str(containsDuplicate(data["nums"])).lower())',
  1000, 128, '{"nums": [1,2,3,1]}', 'true'
);

INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
('22222222-2222-2222-2222-222222222222', '{"nums": [1,2,3,1]}', 'true', false),
('22222222-2222-2222-2222-222222222222', '{"nums": [1,2,3,4]}', 'false', false);


-- 3. Reverse String
INSERT INTO problems (id, title, difficulty, category, description, constraints, starter_code_js, starter_code_java, starter_code_cpp, starter_code_py, time_limit, memory_limit, sample_input, sample_output) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Reverse String', 'Easy', 'String',
  'Write a function that reverses a string. The input string is given as an array of characters s.',
  '1 <= s.length <= 10^5',
  'function reverseString(s) {
    // Your code here
    return s;
}

const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(JSON.stringify(reverseString(input.s)));',
  'import java.util.*;

public class Main {
    public static char[] reverseString(char[] s) {
        // Your code here
        return s;
    }

    public static void main(String[] args) {
        System.out.println("[]"); // Simplified for demo
    }
}',
  '#include <iostream>
#include <vector>
using namespace std;

vector<char> reverseString(vector<char>& s) {
    // Your code here
    return s;
}

int main() {
    cout << "[]" << endl; // Simplified for demo
    return 0;
}',
  'import sys, json

def reverseString(s):
    # Your code here
    return s

data = json.load(sys.stdin)
print(json.dumps(reverseString(data["s"])))',
  1000, 128, '{"s": ["h","e","l","l","o"]}', '["o","l","l","e","h"]'
);

INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
('33333333-3333-3333-3333-333333333333', '{"s": ["h","e","l","l","o"]}', '["o","l","l","e","h"]', false),
('33333333-3333-3333-3333-333333333333', '{"s": ["H","a","n","n","a","h"]}', '["h","a","n","n","a","H"]', false);


-- 4. Valid Parentheses
INSERT INTO problems (id, title, difficulty, category, description, constraints, starter_code_js, starter_code_java, starter_code_cpp, starter_code_py, time_limit, memory_limit, sample_input, sample_output) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Valid Parentheses', 'Easy', 'Stack',
  'Given a string s containing just the characters ( ) { } [ ], determine if the input string is valid.',
  '1 <= s.length <= 10^4',
  'function isValid(s) {
    // Your code here
    return false;
}

const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(isValid(input.s));',
  'import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        // Your code here
        return false;
    }

    public static void main(String[] args) {
        System.out.println("true"); // Simplified for demo
    }
}',
  '#include <iostream>
#include <string>
using namespace std;

bool isValid(string s) {
    // Your code here
    return false;
}

int main() {
    cout << "true" << endl; // Simplified for demo
    return 0;
}',
  'import sys, json

def isValid(s):
    # Your code here
    return False

data = json.load(sys.stdin)
print(str(isValid(data["s"])).lower())',
  1000, 128, '{"s": "()"}', 'true'
);

INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
('44444444-4444-4444-4444-444444444444', '{"s": "()"}', 'true', false),
('44444444-4444-4444-4444-444444444444', '{"s": "(]"}', 'false', false);


-- 5. Missing Number
INSERT INTO problems (id, title, difficulty, category, description, constraints, starter_code_js, starter_code_java, starter_code_cpp, starter_code_py, time_limit, memory_limit, sample_input, sample_output) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Missing Number', 'Easy', 'Array',
  'Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.',
  'n == nums.length
1 <= n <= 10^4',
  'function missingNumber(nums) {
    // Your code here
    return 0;
}

const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(missingNumber(input.nums));',
  'import java.util.*;

public class Main {
    public static int missingNumber(int[] nums) {
        // Your code here
        return 0;
    }

    public static void main(String[] args) {
        System.out.println("0"); // Simplified for demo
    }
}',
  '#include <iostream>
#include <vector>
using namespace std;

int missingNumber(vector<int>& nums) {
    // Your code here
    return 0;
}

int main() {
    cout << "0" << endl; // Simplified for demo
    return 0;
}',
  'import sys, json

def missingNumber(nums):
    # Your code here
    return 0

data = json.load(sys.stdin)
print(missingNumber(data["nums"]))',
  1000, 128, '{"nums": [3,0,1]}', '2'
);

INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
('55555555-5555-5555-5555-555555555555', '{"nums": [3,0,1]}', '2', false),
('55555555-5555-5555-5555-555555555555', '{"nums": [0,1]}', '2', false);
