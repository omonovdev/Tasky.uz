import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { authState } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Help = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authState.isLoggedIn()) navigate("/auth");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t("helpPage.toastTitle"),
      description: t("helpPage.toastDesc"),
    });
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 pb-24">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("helpPage.title")}</h1>
          <p className="text-muted-foreground">
            {t("helpPage.subtitle")}
          </p>
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>{t("helpPage.faqTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>{t("helpPage.faq.createTask.q")}</AccordionTrigger>
                <AccordionContent>
                  {t("helpPage.faq.createTask.a")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  {t("helpPage.faq.updateProfile.q")}
                </AccordionTrigger>
                <AccordionContent>
                  {t("helpPage.faq.updateProfile.a")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>{t("helpPage.faq.taskStages.q")}</AccordionTrigger>
                <AccordionContent>
                  {t("helpPage.faq.taskStages.a")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  {t("helpPage.faq.leaderboard.q")}
                </AccordionTrigger>
                <AccordionContent>
                  {t("helpPage.faq.leaderboard.a")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>
                  {t("helpPage.faq.deleteTask.q")}
                </AccordionTrigger>
                <AccordionContent>
                  {t("helpPage.faq.deleteTask.a")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>
                  {t("helpPage.faq.changePassword.q")}
                </AccordionTrigger>
                <AccordionContent>
                  {t("helpPage.faq.changePassword.a")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>{t("helpPage.contactTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t("helpPage.contactEmail")}</p>
                  <p className="text-sm text-muted-foreground">contacttobepartner@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t("helpPage.contactPhone")}</p>
                  <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">{t("helpPage.form.subject")}</Label>
                <Input id="subject" placeholder={t("helpPage.form.subjectPlaceholder")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t("helpPage.form.message")}</Label>
                <Textarea
                  id="message"
                  placeholder={t("helpPage.form.messagePlaceholder")}
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {t("helpPage.form.send")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
