import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [fullnames, setFullnames] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedAccounts, setGeneratedAccounts] = useState<Array<{
    fullname: string;
    email: string;
    password: string;
    status: 'success' | 'error';
    error?: string;
  }>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const capitalizeFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const transliterate = (str: string): string => {
    const ruToEn: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
      'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };

    return str.toLowerCase().split('').map(char => ruToEn[char] || char).join('');
  };

  const generateEmailFromFullName = (fullname: string): string => {
    const parts = fullname.trim().split(/\s+/);
    if (parts.length < 3) return "";

    const lastName = capitalizeFirstLetter(transliterate(parts[0]));
    const firstNameInitial = transliterate(parts[1][0]).toUpperCase();
    const middleNameInitial = transliterate(parts[2][0]).toUpperCase();

    return `${lastName}_${firstNameInitial}${middleNameInitial}@mip.ru`;
  };

  const generateRandomPassword = (): string => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*(),.?":{}|<>';

    const getRandomChar = (str: string) => str[Math.floor(Math.random() * str.length)];

    // Ensure at least one character from each group
    let password = [
      getRandomChar(uppercase),
      getRandomChar(lowercase),
      getRandomChar(numbers),
      getRandomChar(specials)
    ];

    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + specials;
    while (password.length < 12) {
      password.push(getRandomChar(allChars));
    }

    // Shuffle the array
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
  };

  const validatePassword = (password: string): boolean => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    return isLongEnough && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedAccounts([]);

    try {
      // Split input by newlines and filter empty lines
      const names = fullnames.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (names.length === 0) {
        setError("Пожалуйста, введите ФИО пользователей (каждое с новой строки)");
        setIsLoading(false);
        return;
      }

      // Validate each name
      const invalidNames = names.filter(name => name.split(/\s+/).length < 3);
      if (invalidNames.length > 0) {
        setError(`Некорректный формат ФИО: ${invalidNames.join(', ')}. Введите Фамилию Имя Отчество полностью через пробел.`);
        setIsLoading(false);
        return;
      }

      const results = [];

      // Process each user
      for (const fullname of names) {
        try {
          // Generate email and password
          const email = generateEmailFromFullName(fullname);
          const password = generateRandomPassword();
          
          // Validate generated password
          if (!validatePassword(password)) {
            results.push({
              fullname,
              email,
              password,
              status: 'error',
              error: 'Не удалось сгенерировать валидный пароль'
            });
            continue;
          }

          // Registration flow
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
            },
          });
          
          if (signUpError) throw signUpError;
          
          if (data?.user?.identities?.length === 0) {
            results.push({
              fullname,
              email,
              password,
              status: 'error',
              error: 'Пользователь с таким email уже существует'
            });
            continue;
          }

          if (!data.user || !data.user.id) {
            throw new Error("Не удалось получить данные пользователя");
          }

          // Create user record in the users table
          const { error: userError } = await supabase
            .from('users')
            .insert({
              fullname,
              email,
              user_unique_id: data.user.id,
              password: password,
            });

          if (userError) {
            throw new Error("Не удалось создать запись пользователя: " + userError.message);
          }

          results.push({
            fullname,
            email,
            password,
            status: 'success'
          });
        } catch (err: any) {
          console.error(`Registration error for ${fullname}:`, err);
          
          let errorMessage = "Произошла ошибка при регистрации";
          
          if (err.message === "Invalid login credentials") {
            errorMessage = "Неверный email или пароль";
          } else if (err.message.includes("password")) {
            errorMessage = "Пароль должен быть не менее 6 символов";
          } else if (err.message.includes("email")) {
            errorMessage = "Введите корректный email";
          } else if (err.message.includes("Email not confirmed")) {
            errorMessage = "Пожалуйста, подтвердите ваш email";
          }
          
          results.push({
            fullname,
            email: generateEmailFromFullName(fullname),
            password: generateRandomPassword(),
            status: 'error',
            error: errorMessage
          });
        }
      }

      setGeneratedAccounts(results);
      
      // Count successful registrations
      const successCount = results.filter(r => r.status === 'success').length;
      
      if (successCount > 0) {
        toast({
          title: "Регистрация завершена",
          description: `Успешно зарегистрировано ${successCount} из ${names.length} пользователей`,
        });
      }

      if (successCount === names.length) {
        // Reset form if all registrations were successful
        setFullnames("");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Произошла непредвиденная ошибка при обработке запроса");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Массовая регистрация пользователей</CardTitle>
          <CardDescription>
            Введите ФИО пользователей (каждое с новой строки) для создания учетных записей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullnames">ФИО пользователей (каждое с новой строки)</Label>
              <Textarea
                id="fullnames"
                placeholder={`Иванов Аркадий Павлович\nПетрова Анна Сергеевна\nСидоров Дмитрий Иванович`}
                value={fullnames}
                onChange={(e) => setFullnames(e.target.value)}
                required
                rows={5}
              />
              <p className="text-sm text-muted-foreground">
                Введите Фамилию Имя Отчество полностью через пробел для каждого пользователя
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Регистрация..." : "Зарегистрировать пользователей"}
            </Button>
          </form>

          {generatedAccounts.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-medium">Результаты регистрации:</h3>
              <div className="border rounded-md divide-y">
                {generatedAccounts.map((account, index) => (
                  <div 
                    key={index} 
                    className={`p-3 ${account.status === 'success' ? 'bg-success/10' : 'bg-destructive/10'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{account.fullname}</p>
                        <p className="text-sm">Email: {account.email}</p>
                        <p className="text-sm">Пароль: {account.password}</p>
                      </div>
                      <div className="text-sm">
                        {account.status === 'success' ? (
                          <span className="text-success">Успешно</span>
                        ) : (
                          <span className="text-destructive">Ошибка: {account.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;