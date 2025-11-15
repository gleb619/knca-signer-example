package knca.signer.example;

import java.util.Objects;

public class Document {

    private String id;
    private String content;
    private String signature;

    public Document() {}

    public Document(String id, String content) {
        this.id = id;
        this.content = content;
        this.signature = null;
    }

    public boolean isSigned() {
        return Objects.nonNull(signature);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

}
