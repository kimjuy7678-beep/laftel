
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickMenu from "@/components/QuickMenu";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <main>{children}</main>
            <Footer />
            <QuickMenu />
        </>
    );
}